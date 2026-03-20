import type { ChunkUploadFileInfo } from "@/api/fileM/chunk"
import SparkMD5 from "spark-md5"
import { computed, ref, shallowRef } from "vue"
import { completeChunkUpload, initChunkUpload, uploadChunk } from "@/api/fileM/chunk"

// 上传状态
export type UploadStatus
  = | "idle" // 空闲
    | "hashing" // 计算MD5中
    | "checking" // 检测秒传中
    | "uploading" // 上传中
    | "paused" // 已暂停
    | "merging" // 合并中
    | "success" // 上传成功
    | "error" // 上传失败

// 上传结果
export interface UploadResult {
  file: ChunkUploadFileInfo
  instantUpload: boolean // 是否秒传
}

// 配置选项
export interface ChunkUploadOptions {
  chunkSize?: number // 分片大小，默认5MB
  concurrent?: number // 并发数，默认3
  onProgress?: (progress: number) => void // 进度回调
  onStatusChange?: (status: UploadStatus) => void // 状态变化回调
  onSuccess?: (result: UploadResult) => void // 成功回调
  onError?: (error: Error) => void // 失败回调
}

// 分片信息
interface ChunkInfo {
  index: number
  start: number
  end: number
  blob: Blob
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_CONCURRENT = 3
const MAX_RETRY_COUNT = 3 // 分片上传最大重试次数

export function useChunkUpload(options: ChunkUploadOptions = {}) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    concurrent = DEFAULT_CONCURRENT,
    onProgress,
    onStatusChange,
    onSuccess,
    onError
  } = options

  // 状态
  const status = ref<UploadStatus>("idle")
  const progress = ref(0)
  const errorMessage = ref("")
  const file = shallowRef<File | null>(null)
  const uploadId = ref("")
  const uploadedChunks = ref<Set<number>>(new Set())
  const totalChunks = ref(0)
  const result = ref<UploadResult | null>(null)

  // 控制标志
  let isPaused = false
  let isCancelled = false
  let activeRequests = 0

  // 状态文本
  const statusText = computed(() => {
    switch (status.value) {
      case "idle": return ""
      case "hashing": return "计算文件指纹中..."
      case "checking": return "检测秒传中..."
      case "uploading": return `上传中 ${progress.value}%`
      case "paused": return `已暂停 ${progress.value}%`
      case "merging": return "合并文件中..."
      case "success": return "上传完成"
      case "error": return errorMessage.value || "上传失败"
      default: return ""
    }
  })

  // 更新状态
  function setStatus(newStatus: UploadStatus) {
    status.value = newStatus
    onStatusChange?.(newStatus)
  }

  // 更新进度
  function setProgress(value: number) {
    progress.value = value
    onProgress?.(value)
  }

  // 计算文件MD5
  async function calculateFileMd5(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer()
      const fileReader = new FileReader()
      const chunkSizeForHash = 2 * 1024 * 1024 // 2MB per chunk for hashing
      let currentChunk = 0
      const chunks = Math.ceil(file.size / chunkSizeForHash)

      fileReader.onload = (e) => {
        if (e.target?.result) {
          spark.append(e.target.result as ArrayBuffer)
        }
        currentChunk++

        if (currentChunk < chunks) {
          loadNext()
        } else {
          resolve(spark.end())
        }
      }

      fileReader.onerror = () => {
        reject(new Error("文件读取失败"))
      }

      function loadNext() {
        const start = currentChunk * chunkSizeForHash
        const end = Math.min(start + chunkSizeForHash, file.size)
        fileReader.readAsArrayBuffer(file.slice(start, end))
      }

      loadNext()
    })
  }

  // 创建分片
  function createChunks(file: File): ChunkInfo[] {
    const chunks: ChunkInfo[] = []
    let start = 0
    let index = 0

    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size)
      chunks.push({
        index,
        start,
        end,
        blob: file.slice(start, end)
      })
      start = end
      index++
    }

    return chunks
  }

  // 上传单个分片（带重试逻辑）
  async function uploadChunkWithRetry(
    uploadIdValue: string,
    chunkIndex: number,
    blob: Blob
  ): Promise<void> {
    let lastError: any = null

    for (let attempt = 0; attempt <= MAX_RETRY_COUNT; attempt++) {
      try {
        await uploadChunk(uploadIdValue, chunkIndex, blob)
        return // 上传成功，直接返回
      } catch (error: any) {
        lastError = error
        console.warn(`[ChunkUpload] 分片 ${chunkIndex} 上传失败，第 ${attempt + 1} 次尝试`, error)

        // 如果已取消或暂停，不再重试
        if (isCancelled || isPaused) {
          throw error
        }

        // 如果还有重试机会，等待后重试
        if (attempt < MAX_RETRY_COUNT) {
          // 指数退避：1秒、2秒、4秒
          const delay = 2 ** attempt * 1000
          console.log(`[ChunkUpload] 分片 ${chunkIndex} 将在 ${delay}ms 后重试`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // 重试次数用尽，抛出最后一次错误
    console.error(`[ChunkUpload] 分片 ${chunkIndex} 上传失败，已重试 ${MAX_RETRY_COUNT} 次`)
    throw lastError
  }

  // 并发上传分片
  async function uploadChunksWithConcurrency(
    chunks: ChunkInfo[],
    uploadIdValue: string,
    uploadedSet: Set<number>
  ): Promise<void> {
    // 过滤已上传的分片
    const pendingChunks = chunks.filter(chunk => !uploadedSet.has(chunk.index))

    if (pendingChunks.length === 0) {
      return
    }

    return new Promise((resolve, reject) => {
      let currentIndex = 0
      let completedCount = uploadedSet.size
      const totalCount = chunks.length

      async function uploadNext() {
        if (isCancelled) {
          reject(new Error("上传已取消"))
          return
        }

        if (isPaused) {
          // 暂停时等待所有活跃请求完成
          if (activeRequests === 0) {
            resolve()
          }
          return
        }

        if (currentIndex >= pendingChunks.length) {
          // 没有更多分片需要上传
          if (activeRequests === 0) {
            resolve()
          }
          return
        }

        const chunk = pendingChunks[currentIndex]
        currentIndex++
        activeRequests++

        try {
          // 使用带重试逻辑的上传方法
          await uploadChunkWithRetry(uploadIdValue, chunk.index, chunk.blob)
          uploadedSet.add(chunk.index)
          completedCount++

          // 更新进度
          const newProgress = Math.floor((completedCount / totalCount) * 100)
          setProgress(newProgress)

          activeRequests--
          uploadNext()
        } catch (error: any) {
          activeRequests--
          if (!isCancelled && !isPaused) {
            // 检测超时或网络错误
            const isTimeout = error?.code === "ECONNABORTED"
              || error?.message?.includes("timeout")
              || error?.message === "服务器内部错误"
            if (isTimeout) {
              reject(new Error("网络原因，上传视频超时，请重新上传视频"))
            } else {
              reject(error)
            }
          }
        }
      }

      // 启动并发上传
      const initialCount = Math.min(concurrent, pendingChunks.length)
      for (let i = 0; i < initialCount; i++) {
        uploadNext()
      }
    })
  }

  // 开始上传
  async function start(fileToUpload: File): Promise<UploadResult | null> {
    if (status.value === "uploading" || status.value === "merging") {
      return null
    }

    // 重置状态
    file.value = fileToUpload
    isPaused = false
    isCancelled = false
    errorMessage.value = ""
    result.value = null
    uploadedChunks.value = new Set()

    try {
      // 1. 计算MD5
      setStatus("hashing")
      setProgress(0)
      console.log("[ChunkUpload] 开始计算文件MD5:", fileToUpload.name)
      const fileMd5 = await calculateFileMd5(fileToUpload)
      console.log("[ChunkUpload] MD5计算完成:", fileMd5)

      if (isCancelled) {
        setStatus("idle")
        return null
      }

      // 2. 初始化上传（检测秒传）
      setStatus("checking")
      console.log("[ChunkUpload] 初始化上传请求:", { fileName: fileToUpload.name, fileSize: fileToUpload.size, fileMd5, chunkSize })
      const initRes = await initChunkUpload({
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        fileMd5,
        chunkSize
      })
      console.log("[ChunkUpload] 初始化上传响应:", initRes)

      if (isCancelled) {
        setStatus("idle")
        return null
      }

      // 秒传成功
      if (initRes.data.status === "completed" && initRes.data.file) {
        setProgress(100)
        setStatus("success")
        const uploadResult: UploadResult = {
          file: initRes.data.file,
          instantUpload: true
        }
        result.value = uploadResult
        onSuccess?.(uploadResult)
        return uploadResult
      }

      // 3. 准备分片上传
      uploadId.value = initRes.data.uploadId
      totalChunks.value = initRes.data.totalChunks
      uploadedChunks.value = new Set(initRes.data.uploadedChunks || [])
      console.log("[ChunkUpload] 准备分片上传:", { uploadId: uploadId.value, totalChunks: totalChunks.value, uploadedChunks: Array.from(uploadedChunks.value) })

      // 计算初始进度（断点续传场景）
      const initialProgress = Math.floor((uploadedChunks.value.size / totalChunks.value) * 100)
      setProgress(initialProgress)
      setStatus("uploading")

      // 4. 分片上传
      const chunks = createChunks(fileToUpload)
      console.log("[ChunkUpload] 开始分片上传，总分片数:", chunks.length)
      await uploadChunksWithConcurrency(chunks, uploadId.value, uploadedChunks.value)
      console.log("[ChunkUpload] 分片上传完成")

      if (isCancelled) {
        setStatus("idle")
        return null
      }

      if (isPaused) {
        setStatus("paused")
        return null
      }

      // 5. 验证所有分片已上传完成
      if (uploadedChunks.value.size !== totalChunks.value) {
        console.error("[ChunkUpload] 分片数量不匹配:", { uploaded: uploadedChunks.value.size, total: totalChunks.value })
        throw new Error(`分片上传不完整，已上传 ${uploadedChunks.value.size}/${totalChunks.value}`)
      }
      console.log("[ChunkUpload] 分片验证通过:", { uploaded: uploadedChunks.value.size, total: totalChunks.value })

      // 6. 完成上传（合并）
      setStatus("merging")
      console.log("[ChunkUpload] 开始合并文件:", uploadId.value)
      const completeRes = await completeChunkUpload(uploadId.value)
      console.log("[ChunkUpload] 合并完成:", completeRes)

      setProgress(100)
      setStatus("success")

      const uploadResult: UploadResult = {
        file: completeRes.data.file,
        instantUpload: false
      }
      result.value = uploadResult
      onSuccess?.(uploadResult)
      return uploadResult
    } catch (error: any) {
      console.error("[ChunkUpload] 上传失败:", error)
      // 检测超时或网络错误
      const isTimeout = error?.code === "ECONNABORTED"
        || error?.message?.includes("timeout")
        || error?.message === "服务器内部错误"
      const err = isTimeout
        ? new Error("网络原因，上传视频超时，请重新上传视频")
        : (error instanceof Error ? error : new Error(String(error)))
      errorMessage.value = err.message
      setStatus("error")
      onError?.(err)
      return null
    }
  }

  // 暂停上传
  function pause() {
    if (status.value === "uploading") {
      isPaused = true
      setStatus("paused")
    }
  }

  // 继续上传
  async function resume(): Promise<UploadResult | null> {
    if (status.value !== "paused" || !file.value) {
      return null
    }

    isPaused = false
    setStatus("uploading")

    try {
      const chunks = createChunks(file.value)
      await uploadChunksWithConcurrency(chunks, uploadId.value, uploadedChunks.value)

      if (isCancelled) {
        setStatus("idle")
        return null
      }

      if (isPaused) {
        setStatus("paused")
        return null
      }

      // 验证所有分片已上传完成
      if (uploadedChunks.value.size !== totalChunks.value) {
        console.error("[ChunkUpload] 分片数量不匹配:", { uploaded: uploadedChunks.value.size, total: totalChunks.value })
        throw new Error(`分片上传不完整，已上传 ${uploadedChunks.value.size}/${totalChunks.value}`)
      }
      console.log("[ChunkUpload] 分片验证通过:", { uploaded: uploadedChunks.value.size, total: totalChunks.value })

      // 完成上传
      setStatus("merging")
      const completeRes = await completeChunkUpload(uploadId.value)

      setProgress(100)
      setStatus("success")

      const uploadResult: UploadResult = {
        file: completeRes.data.file,
        instantUpload: false
      }
      result.value = uploadResult
      onSuccess?.(uploadResult)
      return uploadResult
    } catch (error: any) {
      // 检测超时或网络错误
      const isTimeout = error?.code === "ECONNABORTED"
        || error?.message?.includes("timeout")
        || error?.message === "服务器内部错误"
      const err = isTimeout
        ? new Error("网络原因，上传视频超时，请重新上传视频")
        : (error instanceof Error ? error : new Error(String(error)))
      errorMessage.value = err.message
      setStatus("error")
      onError?.(err)
      return null
    }
  }

  // 取消上传（不调用删除接口，保留已上传的分片供后续断点续传）
  function cancel() {
    isCancelled = true
    isPaused = false

    // 重置状态（不调用 abortChunkUpload 删除接口）
    file.value = null
    uploadId.value = ""
    uploadedChunks.value = new Set()
    totalChunks.value = 0
    result.value = null
    setProgress(0)
    setStatus("idle")
  }

  // 重置（不调用取消API）
  function reset() {
    isCancelled = true
    isPaused = false
    file.value = null
    uploadId.value = ""
    uploadedChunks.value = new Set()
    totalChunks.value = 0
    result.value = null
    errorMessage.value = ""
    setProgress(0)
    setStatus("idle")
    isCancelled = false
  }

  return {
    // 状态
    status,
    statusText,
    progress,
    errorMessage,
    file,
    result,

    // 方法
    start,
    pause,
    resume,
    cancel,
    reset
  }
}
