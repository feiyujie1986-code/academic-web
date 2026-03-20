import { request } from "@/http/axios_n"

// 初始化直传请求参数
export interface InitDirectUploadReq {
  fileName: string
  fileSize: number
  fileMd5: string
  mimeType: string
}

// 文件信息
export interface UploadFileInfo {
  id: number
  filename: string
  fullpath: string
  size: number
  md5: string
  provider?: string
}

// 直传初始化响应
export interface DirectUploadInitRes {
  uploadId?: string
  uploadMethod: "direct" | "instant" | "chunk"
  uploadUrl?: string
  uploadHeaders?: Record<string, string>
  objectKey?: string
  expiresAt?: number
  file?: UploadFileInfo
  message?: string
}

// 确认上传请求参数
export interface ConfirmDirectUploadReq {
  uploadId: string
  objectKey: string
  etag?: string
}

/**
 * 初始化直传上传
 */
export function initDirectUpload(data: InitDirectUploadReq) {
  return request<ApiResponseData<DirectUploadInitRes>>({
    url: "/v2/admin/files/direct/init",
    method: "post",
    data,
    timeout: 30000,
    silent: true // 上传过程中不显示全局错误提示
  })
}

/**
 * 确认直传完成
 */
export function confirmDirectUpload(data: ConfirmDirectUploadReq) {
  return request<ApiResponseData<UploadFileInfo>>({
    url: "/v2/admin/files/direct/confirm",
    method: "post",
    data,
    timeout: 30000,
    silent: true // 上传过程中不显示全局错误提示
  })
}

/**
 * 直接上传到云存储（使用 XMLHttpRequest 确保进度可靠）
 * @param uploadUrl 预签名上传 URL
 * @param file 文件或 Blob
 * @param headers 请求头
 * @param onProgress 进度回调 (0-100)
 * @returns ETag 或 null
 */
export function uploadToCloud(
  uploadUrl: string,
  file: File | Blob,
  headers: Record<string, string>,
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
        reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
      }
    }

    // 上传错误
    xhr.onerror = () => {
      reject(new Error("网络错误，上传失败"))
    }

    // 上传超时
    xhr.ontimeout = () => {
      reject(new Error("上传超时"))
    }

    // 发起请求
    xhr.open("PUT", uploadUrl, true)

    // 设置请求头
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })

    // 发送文件
    xhr.send(file)
  })
}

/**
 * 带取消功能的上传到云存储
 * @returns 包含 promise 和 cancel 函数的对象
 */
export function uploadToCloudWithCancel(
  uploadUrl: string,
  file: File | Blob,
  headers: Record<string, string>,
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
        reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => reject(new Error("网络错误，上传失败"))
    xhr.ontimeout = () => reject(new Error("上传超时"))
    xhr.onabort = () => reject(new Error("上传已取消"))

    xhr.open("PUT", uploadUrl, true)
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })
    xhr.send(file)
  })

  return {
    promise,
    cancel: () => xhr.abort()
  }
}
