import { request } from "@/http/axios_n"

// 初始化分片上传请求参数
export interface InitMultipartUploadReq {
  fileName: string
  fileSize: number
  fileMd5: string
  mimeType: string
  partSize?: number // 可选，不传则服务端自动计算
}

// 分片上传初始化响应
export interface MultipartUploadInitRes {
  uploadId?: string
  uploadMethod: "multipart" | "instant"
  objectKey?: string
  partSize?: number
  totalParts?: number
  expiresAt?: number
  file?: {
    id: number
    filename: string
    fullpath: string
    size: number
    md5: string
    provider?: string
  }
  message?: string
}

// 获取分片上传 URL 请求参数
export interface GetPartUrlReq {
  uploadId: string
  partNumber: number
}

// 分片上传 URL 响应
export interface PartUrlRes {
  uploadId: string
  partNumber: number
  uploadUrl: string
  expiresAt: number
}

// 上报分片完成请求参数
export interface ReportPartCompleteReq {
  uploadId: string
  partNumber: number
  etag: string
  size: number
}

// 上传进度信息
export interface UploadProgress {
  uploadedChunks: number
  totalChunks: number
  percent: number
  uploadedSize: number
}

// 上报分片完成响应
export interface PartCompleteRes {
  partNumber: number
  uploaded: boolean
  progress: UploadProgress
}

// 完成分片上传响应
export interface MultipartCompleteRes {
  file: {
    id: number
    filename: string
    fullpath: string
    size: number
    md5: string
    provider?: string
  }
}

// 分片上传状态响应
export interface MultipartStatusRes {
  uploadId: string
  fileName: string
  fileSize: number
  partSize: number
  totalParts: number
  status: "pending" | "uploading" | "completed" | "failed" | "expired"
  progress: UploadProgress
  uploadedPartList: number[]
}

/**
 * 初始化分片上传
 */
export function initMultipartUpload(data: InitMultipartUploadReq) {
  return request<ApiResponseData<MultipartUploadInitRes>>({
    url: "/v2/admin/files/multipart/init",
    method: "post",
    data,
    timeout: 30000,
    silent: true // 上传过程中不显示全局错误提示
  })
}

/**
 * 获取分片预签名 URL
 */
export function getPartUrl(data: GetPartUrlReq) {
  return request<ApiResponseData<PartUrlRes>>({
    url: "/v2/admin/files/multipart/part-url",
    method: "post",
    data,
    timeout: 30000,
    silent: true // 上传过程中不显示全局错误提示
  })
}

/**
 * 上报分片上传完成
 */
export function reportPartComplete(data: ReportPartCompleteReq) {
  return request<ApiResponseData<PartCompleteRes>>({
    url: "/v2/admin/files/multipart/part-complete",
    method: "post",
    data,
    timeout: 30000,
    silent: true // 上传过程中不显示全局错误提示
  })
}

/**
 * 完成分片上传（合并分片）
 */
export function completeMultipartUpload(uploadId: string) {
  return request<ApiResponseData<MultipartCompleteRes>>({
    url: "/v2/admin/files/multipart/complete",
    method: "post",
    data: { uploadId },
    timeout: 300000, // 合并可能需要较长时间
    silent: true // 上传过程中不显示全局错误提示
  })
}

/**
 * 查询分片上传状态（用于断点续传）
 */
export function getMultipartStatus(uploadId: string) {
  return request<ApiResponseData<MultipartStatusRes>>({
    url: "/v2/admin/files/multipart/status",
    method: "get",
    params: { uploadId },
    timeout: 30000,
    silent: true // 上传过程中不显示全局错误提示
  })
}

/**
 * 取消分片上传
 */
export function abortMultipartUpload(uploadId: string) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/files/multipart/abort",
    method: "delete",
    params: { uploadId },
    timeout: 30000,
    silent: true // 上传过程中不显示全局错误提示
  })
}

/**
 * 上传分片到云存储（使用 XMLHttpRequest 确保进度可靠）
 * @param uploadUrl 预签名上传 URL
 * @param chunk 分片数据
 * @param mimeType 文件 MIME 类型
 * @param onProgress 进度回调 (0-100)
 * @returns ETag 或 null
 */
export function uploadPartToCloud(
  uploadUrl: string,
  chunk: Blob,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // 上传进度
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    // 上传完成
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // 获取 ETag（去除引号）
        const etag = xhr.getResponseHeader("ETag")?.replace(/"/g, "") || null
        resolve(etag)
      } else {
        reject(new Error(`分片上传失败: ${xhr.status} ${xhr.statusText}`))
      }
    }

    // 上传错误
    xhr.onerror = () => {
      reject(new Error("网络错误，分片上传失败"))
    }

    // 上传超时
    xhr.ontimeout = () => {
      reject(new Error("分片上传超时"))
    }

    // 发起请求
    xhr.open("PUT", uploadUrl, true)

    // 设置 Content-Type
    xhr.setRequestHeader("Content-Type", mimeType)

    // 发送分片
    xhr.send(chunk)
  })
}

/**
 * 带取消功能的分片上传到云存储
 * @returns 包含 promise 和 cancel 函数的对象
 */
export function uploadPartToCloudWithCancel(
  uploadUrl: string,
  chunk: Blob,
  mimeType: string,
  onProgress?: (progress: number) => void
): { promise: Promise<string | null>, cancel: () => void } {
  const xhr = new XMLHttpRequest()

  const promise = new Promise<string | null>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag")?.replace(/"/g, "") || null
        resolve(etag)
      } else {
        reject(new Error(`分片上传失败: ${xhr.status} ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => reject(new Error("网络错误，分片上传失败"))
    xhr.ontimeout = () => reject(new Error("分片上传超时"))
    xhr.onabort = () => reject(new Error("分片上传已取消"))

    xhr.open("PUT", uploadUrl, true)
    xhr.setRequestHeader("Content-Type", mimeType)
    xhr.send(chunk)
  })

  return {
    promise,
    cancel: () => xhr.abort()
  }
}
