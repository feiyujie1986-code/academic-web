import type { UploadFileInfo } from "@/api/fileM/direct"
import type { InitMultipartUploadReq, MultipartUploadInitRes, StreamVideoInfo } from "@/api/fileM/multipart"
import SparkMD5 from "spark-md5"
import { computed, ref } from "vue"
import {
  confirmDirectUpload,
  initDirectUpload,

  uploadToCloudWithCancel
} from "@/api/fileM/direct"
import {
  abortMultipartUpload,
  completeMultipartUpload,
  getMultipartStatus,
  getPartUrl,
  initMultipartUpload,
  reportPartComplete,
  uploadPartToCloudWithCancel,
  uploadToStreamWithCancel
} from "@/api/fileM/multipart"

// 上传状态
export type UploadStatus = "idle" | "hashing" | "initializing" | "uploading" | "paused" | "completing" | "completed" | "error" | "cancelled"

// Multipart 分片上传阈值（5MB），小于此值使用直传
const MULTIPART_THRESHOLD = 5 * 1024 * 1024

// 默认分片大小（10MB）
const DEFAULT_PART_SIZE = 10 * 1024 * 1024

// 最大重试次数
const MAX_RETRIES = 3

/**
 * 带重试的异步操作
 * @param fn 执行函数
 * @param checkCancelled 检查是否已取消
 * @param maxRetries 最大重试次数
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  checkCancelled: () => boolean,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (checkCancelled()) {
      throw new Error("上传已取消")
    }

    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // 取消操作直接抛出
      if (lastError.message === "上传已取消" || checkCancelled()) {
        throw lastError
      }

      // 最后一次重试失败，抛出统一错误
      if (attempt === maxRetries) {
        throw new Error("上传失败")
      }

      // 静默重试，不显示错误
    }
  }

  throw new Error("上传失败")
}

// 断点信息
interface Checkpoint {
  uploadId: string
  objectKey: string
  partSize: number
  totalParts: number
  uploadedParts: number[]
  fileHash: string
  fileName: string
  fileSize: number
}

// 配置选项
export interface CloudUploadOptions {
  concurrency?: number // 并发数，默认 3
  onProgress?: (progress: number) => void
  onStatusChange?: (status: UploadStatus) => void
  onSuccess?: (result: UploadFileInfo) => void
  onError?: (error: Error) => void
  // 视频上传完成后触发（transcodeStatus 初始为 "processing"，需轮询等待 "completed"）
  onVideoCreated?: (video: StreamVideoInfo) => void
  // 自定义分片上传初始化函数，默认使用通用的 initMultipartUpload；
  // 业务域若需要在初始化阶段附加专属校验（如限定文件大小上限），可传入自己的接口，返回结构需与 initMultipartUpload 一致
  multipartInitFn?: (data: InitMultipartUploadReq) => Promise<ApiResponseData<MultipartUploadInitRes>>
}

// 获取断点存储 key
function getCheckpointKey(fileName: string): string {
  return `multipart_${fileName}`
}

// 保存断点
function saveCheckpoint(checkpoint: Checkpoint): void {
  try {
    localStorage.setItem(getCheckpointKey(checkpoint.fileName), JSON.stringify(checkpoint))
  } catch {
    // localStorage 可能已满，忽略错误
  }
}

// 获取断点
function getCheckpoint(fileName: string): Checkpoint | null {
  try {
    const data = localStorage.getItem(getCheckpointKey(fileName))
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

// 清除断点
function clearCheckpoint(fileName: string): void {
  try {
    localStorage.removeItem(getCheckpointKey(fileName))
  } catch {
    // 忽略错误
  }
}

/**
 * 计算文件 MD5（分块读取，支持大文件）
 */
async function calculateFileMD5(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunkSize = 2 * 1024 * 1024 // 2MB 块
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    const spark = new SparkMD5.ArrayBuffer()
    const reader = new FileReader()

    reader.onload = (e) => {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer)
      }
      currentChunk++

      if (onProgress) {
        // MD5 计算占进度的 0-5%
        const percent = Math.round((currentChunk / chunks) * 5)
        onProgress(percent)
      }

      if (currentChunk < chunks) {
        loadNext()
      } else {
        resolve(spark.end())
      }
    }

    reader.onerror = () => {
      reject(new Error("文件读取失败"))
    }

    function loadNext() {
      const start = currentChunk * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      reader.readAsArrayBuffer(file.slice(start, end))
    }

    loadNext()
  })
}

/**
 * 云存储上传 Composable
 */
export function useCloudUpload(options: CloudUploadOptions = {}) {
  const { concurrency = 3, onProgress, onStatusChange, onSuccess, onError, onVideoCreated, multipartInitFn = initMultipartUpload } = options

  // 状态
  const status = ref<UploadStatus>("idle")
  const progress = ref(0)
  const error = ref<Error | null>(null)
  const result = ref<UploadFileInfo | null>(null)

  // 内部状态
  let currentFile: File | null = null
  let currentUploadId: string | null = null
  let isPaused = false
  let isCancelled = false

  // 当前正在进行的上传请求（用于取消）
  let activeUploads: Array<{ cancel: () => void }> = []

  // 设置状态
  function setStatus(newStatus: UploadStatus) {
    status.value = newStatus
    onStatusChange?.(newStatus)
  }

  // 设置进度
  function setProgress(value: number) {
    progress.value = value
    onProgress?.(value)
  }

  // 重置状态
  function reset() {
    status.value = "idle"
    progress.value = 0
    error.value = null
    result.value = null
    currentFile = null
    currentUploadId = null
    isPaused = false
    isCancelled = false
    activeUploads = []
  }

  /**
   * 直传上传（< 5MB）
   */
  async function uploadDirect(file: File, fileMd5: string): Promise<UploadFileInfo> {
    setStatus("initializing")
    setProgress(5)

    // 初始化直传
    const initRes = await initDirectUpload({
      fileName: file.name,
      fileSize: file.size,
      fileMd5,
      mimeType: file.type || "application/octet-stream"
    })

    if (initRes.code !== 0 || !initRes.data) {
      throw new Error(initRes.msg || "初始化上传失败")
    }

    const { uploadMethod, uploadUrl, uploadHeaders, objectKey, file: instantFile } = initRes.data

    // 秒传成功
    if (uploadMethod === "instant" && instantFile) {
      setProgress(100)
      setStatus("completed")
      return instantFile
    }

    // 需要上传
    if (uploadMethod !== "direct" || !uploadUrl || !uploadHeaders || !objectKey) {
      throw new Error("上传初始化返回数据不完整")
    }

    setStatus("uploading")

    // 上传到云存储（带重试）
    const etag = await withRetry(async () => {
      const { promise, cancel } = uploadToCloudWithCancel(
        uploadUrl,
        file,
        uploadHeaders,
        (percent) => {
          // 上传进度占 5%-95%
          setProgress(5 + Math.round(percent * 0.9))
        }
      )

      activeUploads = [{ cancel }]

      const result = await promise

      if (isCancelled) {
        throw new Error("上传已取消")
      }

      return result
    }, () => isCancelled)

    // 确认上传
    setStatus("completing")
    setProgress(95)

    const confirmRes = await confirmDirectUpload({
      uploadId: initRes.data.uploadId || "",
      objectKey,
      etag: etag || undefined
    })

    if (confirmRes.code !== 0 || !confirmRes.data) {
      throw new Error(confirmRes.msg || "确认上传失败")
    }

    setProgress(100)
    setStatus("completed")
    return confirmRes.data
  }

  /**
   * 分片上传（>= 5MB）
   */
  async function uploadMultipart(file: File, fileMd5: string): Promise<UploadFileInfo> {
    // 检查断点
    const checkpoint = getCheckpoint(file.name)
    let uploadId: string
    let objectKey: string
    let partSize: number
    let totalParts: number
    let uploadedParts: number[] = []

    if (checkpoint && checkpoint.fileHash === fileMd5 && checkpoint.fileSize === file.size) {
      // 验证服务端状态
      try {
        const statusRes = await getMultipartStatus(checkpoint.uploadId)
        if (statusRes.code === 0 && statusRes.data?.status === "uploading") {
          // 恢复上传
          uploadId = checkpoint.uploadId
          objectKey = checkpoint.objectKey
          partSize = checkpoint.partSize
          totalParts = checkpoint.totalParts
          uploadedParts = statusRes.data.uploadedPartList || []
        } else {
          // 服务端状态不对，重新初始化
          clearCheckpoint(file.name)
          return initAndUpload()
        }
      } catch {
        clearCheckpoint(file.name)
        return initAndUpload()
      }
    } else {
      // 清除旧断点（如果有）
      if (checkpoint) {
        clearCheckpoint(file.name)
      }
      return initAndUpload()
    }

    async function initAndUpload(): Promise<UploadFileInfo> {
      setStatus("initializing")
      setProgress(5)

      const initRes = await multipartInitFn({
        fileName: file.name,
        fileSize: file.size,
        fileMd5,
        mimeType: file.type || "application/octet-stream"
      })

      if (initRes.code !== 0 || !initRes.data) {
        throw new Error(initRes.msg || "初始化分片上传失败")
      }

      const { uploadMethod, file: instantFile } = initRes.data

      // 秒传成功
      if (uploadMethod === "instant" && instantFile) {
        setProgress(100)
        setStatus("completed")
        return instantFile
      }

      // Cloudflare Stream 单次上传
      if (uploadMethod === "stream") {
        const { streamUploadUrl, uploadId: streamUploadId } = initRes.data
        if (!streamUploadUrl || !streamUploadId) {
          throw new Error("Stream 上传初始化数据不完整")
        }
        return doStreamUpload(streamUploadId, streamUploadUrl)
      }

      uploadId = initRes.data.uploadId!
      objectKey = initRes.data.objectKey!
      partSize = initRes.data.partSize || DEFAULT_PART_SIZE
      totalParts = initRes.data.totalParts || Math.ceil(file.size / partSize)
      uploadedParts = []

      return doMultipartUpload()
    }

    async function doStreamUpload(streamUploadId: string, streamUploadUrl: string): Promise<UploadFileInfo> {
      setStatus("uploading")

      const { promise, cancel } = uploadToStreamWithCancel(
        streamUploadUrl,
        file,
        (percent) => {
          // 上传进度占 5%-95%
          setProgress(5 + Math.round(percent * 0.9))
        }
      )

      activeUploads = [{ cancel }]
      await promise

      if (isCancelled) {
        throw new Error("上传已取消")
      }

      // 通知后端完成
      setStatus("completing")
      setProgress(95)

      const completeRes = await completeMultipartUpload(streamUploadId)
      if (completeRes.code !== 0 || !completeRes.data) {
        throw new Error(completeRes.msg || "视频上传完成确认失败")
      }

      if (completeRes.data.video) {
        onVideoCreated?.(completeRes.data.video)
      }

      setProgress(100)
      setStatus("completed")
      return completeRes.data.file
    }

    async function doMultipartUpload(): Promise<UploadFileInfo> {
      currentUploadId = uploadId

      // 保存断点
      saveCheckpoint({
        uploadId,
        objectKey,
        partSize,
        totalParts,
        uploadedParts,
        fileHash: fileMd5,
        fileName: file.name,
        fileSize: file.size
      })

      setStatus("uploading")

      // 计算需要上传的分片
      const pendingParts: number[] = []
      for (let i = 1; i <= totalParts; i++) {
        if (!uploadedParts.includes(i)) {
          pendingParts.push(i)
        }
      }

      // 分片进度跟踪
      const partProgress: Record<number, number> = {}
      pendingParts.forEach((p) => {
        partProgress[p] = 0
      })

      // 分片重试次数跟踪
      const partRetryCount: Record<number, number> = {}

      // 更新总进度
      function updateTotalProgress() {
        const completedCount = uploadedParts.length
        let inProgressSum = 0
        Object.values(partProgress).forEach((p) => {
          inProgressSum += p
        })
        const totalProgress = (completedCount + inProgressSum / 100) / totalParts
        // 上传进度占 5%-95%
        setProgress(5 + Math.round(totalProgress * 90))
      }

      // 并发上传分片
      const uploadQueue = [...pendingParts]
      const activePromises: Promise<void>[] = []

      async function uploadNextPart(): Promise<void> {
        while (uploadQueue.length > 0) {
          if (isPaused || isCancelled) {
            return
          }

          const partNumber = uploadQueue.shift()!

          try {
            // 获取预签名 URL
            const urlRes = await getPartUrl({ uploadId, partNumber })
            if (urlRes.code !== 0 || !urlRes.data) {
              throw new Error(urlRes.msg || "获取分片 URL 失败")
            }

            if (isPaused || isCancelled) {
              uploadQueue.unshift(partNumber)
              return
            }

            // 切分片
            const start = (partNumber - 1) * partSize
            const end = Math.min(start + partSize, file.size)
            const chunk = file.slice(start, end)

            // 上传分片
            const { promise, cancel } = uploadPartToCloudWithCancel(
              urlRes.data.uploadUrl,
              chunk,
              file.type || "application/octet-stream",
              (percent) => {
                partProgress[partNumber] = percent
                updateTotalProgress()
              }
            )

            activeUploads.push({ cancel })

            const etag = await promise

            if (isCancelled) {
              return
            }

            // 上报完成
            await reportPartComplete({
              uploadId,
              partNumber,
              etag: etag || "",
              size: chunk.size
            })

            // 更新已完成列表
            uploadedParts.push(partNumber)
            delete partProgress[partNumber]
            updateTotalProgress()

            // 保存断点
            saveCheckpoint({
              uploadId,
              objectKey,
              partSize,
              totalParts,
              uploadedParts,
              fileHash: fileMd5,
              fileName: file.name,
              fileSize: file.size
            })
          } catch {
            if (isCancelled) {
              return
            }

            // 记录重试次数
            partRetryCount[partNumber] = (partRetryCount[partNumber] || 0) + 1

            // 超过最大重试次数，抛出统一错误
            if (partRetryCount[partNumber] >= MAX_RETRIES) {
              throw new Error("上传失败")
            }

            // 未超过重试次数，静默放回队列继续重试
            uploadQueue.push(partNumber)
          }
        }
      }

      // 启动并发上传
      for (let i = 0; i < Math.min(concurrency, pendingParts.length); i++) {
        activePromises.push(uploadNextPart())
      }

      await Promise.all(activePromises)

      if (isCancelled) {
        throw new Error("上传已取消")
      }

      if (isPaused) {
        return {} as UploadFileInfo // 暂停时返回空，等待 resume
      }

      // 完成上传
      setStatus("completing")
      setProgress(95)

      const completeRes = await completeMultipartUpload(uploadId)
      if (completeRes.code !== 0 || !completeRes.data) {
        throw new Error(completeRes.msg || "合并分片失败")
      }

      // 清除断点
      clearCheckpoint(file.name)

      setProgress(100)
      setStatus("completed")
      return completeRes.data.file
    }

    return doMultipartUpload()
  }

  /**
   * 开始上传
   */
  async function upload(file: File): Promise<UploadFileInfo | null> {
    if (status.value === "uploading" || status.value === "hashing") {
      throw new Error("正在上传中，请勿重复操作")
    }

    reset()
    currentFile = file
    isCancelled = false
    isPaused = false

    try {
      // 计算 MD5
      setStatus("hashing")
      const fileMd5 = await calculateFileMD5(file, setProgress)

      if (isCancelled) {
        throw new Error("上传已取消")
      }

      // 根据文件类型和大小选择上传方式
      // 视频文件始终走 multipart init，后端根据 mimeType 决定返回 "stream" 还是 "multipart"
      let uploadResult: UploadFileInfo

      if (file.size < MULTIPART_THRESHOLD && !file.type.startsWith("video/")) {
        // 非视频小文件直传（< 5MB）
        uploadResult = await uploadDirect(file, fileMd5)
      } else {
        // 视频文件或大文件走 multipart init
        uploadResult = await uploadMultipart(file, fileMd5)
      }

      result.value = uploadResult
      onSuccess?.(uploadResult)
      return uploadResult
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error(String(err))

      if (uploadError.message !== "上传已取消" && !isPaused) {
        error.value = uploadError
        setStatus("error")
        onError?.(uploadError)
      }

      return null
    }
  }

  /**
   * 暂停上传（仅 Multipart）
   */
  function pause() {
    if (status.value !== "uploading") {
      return
    }

    isPaused = true
    setStatus("paused")

    // 取消当前请求
    activeUploads.forEach((upload) => {
      try {
        upload.cancel()
      } catch {
        // 忽略取消错误
      }
    })
    activeUploads = []
  }

  /**
   * 继续上传（仅 Multipart）
   */
  async function resume(file?: File): Promise<UploadFileInfo | null> {
    const targetFile = file || currentFile
    if (!targetFile) {
      throw new Error("没有可继续的上传任务")
    }

    if (status.value !== "paused") {
      throw new Error("当前状态不支持继续上传")
    }

    isPaused = false
    isCancelled = false

    try {
      // 重新计算 MD5 并继续
      setStatus("hashing")
      const fileMd5 = await calculateFileMD5(targetFile, setProgress)

      const uploadResult = await uploadMultipart(targetFile, fileMd5)
      result.value = uploadResult
      onSuccess?.(uploadResult)
      return uploadResult
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error(String(err))

      if (uploadError.message !== "上传已取消" && !isPaused) {
        error.value = uploadError
        setStatus("error")
        onError?.(uploadError)
      }

      return null
    }
  }

  /**
   * 取消上传
   */
  async function cancel() {
    isCancelled = true

    // 取消当前请求
    activeUploads.forEach((upload) => {
      try {
        upload.cancel()
      } catch {
        // 忽略取消错误
      }
    })
    activeUploads = []

    // 如果是分片上传，通知服务端取消
    if (currentUploadId) {
      try {
        await abortMultipartUpload(currentUploadId)
      } catch {
        // 忽略取消错误
      }
    }

    // 清除断点
    if (currentFile) {
      clearCheckpoint(currentFile.name)
    }

    setStatus("cancelled")
  }

  return {
    // 状态
    status: computed(() => status.value),
    progress: computed(() => progress.value),
    error: computed(() => error.value),
    result: computed(() => result.value),

    // 方法
    upload,
    pause,
    resume,
    cancel,
    reset
  }
}
