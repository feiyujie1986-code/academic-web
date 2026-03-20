import { request } from "@/http/axios_n"

// 初始化上传请求参数
export interface InitChunkUploadReq {
  fileName: string
  fileSize: number
  fileMd5?: string
  chunkSize?: number
}

// 初始化上传响应 - 文件信息（秒传成功时返回）
export interface ChunkUploadFileInfo {
  id: number
  filename: string
  fullpath: string
  size: number
  md5: string
}

// 初始化上传响应
export interface InitChunkUploadRes {
  uploadId: string
  chunkSize: number
  totalChunks: number
  uploadedChunks: number[]
  status: "uploading" | "completed"
  file?: ChunkUploadFileInfo
}

// 上传分片响应
export interface UploadChunkRes {
  chunkIndex: number
  uploaded: boolean
  progress: {
    uploadedChunks: number
    totalChunks: number
    percent: number
  }
}

// 完成上传响应
export interface CompleteChunkUploadRes {
  file: ChunkUploadFileInfo
}

// 查询上传状态响应
export interface ChunkUploadStatusRes {
  uploadId: string
  fileName: string
  fileSize: number
  status: "uploading" | "merging" | "completed" | "failed" | "expired"
  progress: {
    uploadedChunks: number
    totalChunks: number
    percent: number
    uploadedSize: number
  }
  uploadedChunkList: number[]
}

/**
 * 初始化分片上传
 * 支持秒传检测和断点续传
 */
export function initChunkUpload(data: InitChunkUploadReq) {
  return request<ApiResponseData<InitChunkUploadRes>>({
    url: "/v2/admin/files/chunks/init",
    method: "post",
    data,
    timeout: 30000 // 初始化超时30秒
  })
}

/**
 * 上传单个分片
 */
export function uploadChunk(uploadId: string, chunkIndex: number, chunk: Blob, chunkMd5?: string) {
  const formData = new FormData()
  formData.append("uploadId", uploadId)
  formData.append("chunkIndex", chunkIndex.toString())
  formData.append("file", chunk)
  if (chunkMd5) {
    formData.append("chunkMd5", chunkMd5)
  }

  return request<ApiResponseData<UploadChunkRes>>({
    url: "/v2/admin/files/chunks/upload",
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data"
    },
    timeout: 120000, // 分片上传超时时间设为2分钟
    silent: "timeout" // 仅超时静默
  })
}

/**
 * 完成分片上传（合并分片）
 */
export function completeChunkUpload(uploadId: string) {
  return request<ApiResponseData<CompleteChunkUploadRes>>({
    url: "/v2/admin/files/chunks/complete",
    method: "post",
    data: { uploadId },
    timeout: 300000, // 合并文件可能耗时较长，设为5分钟
    silent: "timeout" // 仅超时静默
  })
}

/**
 * 查询上传状态
 */
export function getChunkUploadStatus(uploadId: string) {
  return request<ApiResponseData<ChunkUploadStatusRes>>({
    url: "/v2/admin/files/chunks/status",
    method: "get",
    params: { uploadId }
  })
}

/**
 * 取消上传
 */
export function abortChunkUpload(uploadId: string) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/files/chunks",
    method: "delete",
    params: { uploadId }
  })
}
