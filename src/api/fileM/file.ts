import { request } from "@/http/axios_n"

interface reqFiles extends PageInfo {
  name?: string
  orderKey?: string
  desc?: boolean
}

interface fileData {
  filename: string
  fullpath: string
  mime: string
  size: number
  md5: string
  provider?: string // 存储提供商，如 "r2"
}

export interface fileDataModel extends fileData, BaseModel {}

// List
export type fileListData = ListData<fileDataModel[]>

// 分页获取文件信息
export function getFileListApi(data: reqFiles) {
  return request<ApiResponseData<fileListData>>({
    url: "/v2/admin/files/list",
    method: "post",
    data
  })
}

// 下载文件
export function downloadApi(params: { fileName: string }) {
  return request({
    url: "/v2/admin/files/download",
    method: "get",
    params,
    responseType: "blob"
  })
}

// 删除文件
export function deleteApi(params: { fileName: string }) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/files",
    method: "delete",
    params
  })
}

// 文件上传配置
const UPLOAD_CONFIG = {
  maxSize: 100 * 1024 * 1024, // 最大文件大小：100MB
  maxSizeText: "100MB"
}

// 文件上传预验证
function validateFile(file: File): { valid: boolean, error?: string } {
  // 检查文件是否存在
  if (!file) {
    return { valid: false, error: "请选择要上传的文件" }
  }

  // 检查文件大小
  if (file.size > UPLOAD_CONFIG.maxSize) {
    return { valid: false, error: `文件大小不能超过 ${UPLOAD_CONFIG.maxSizeText}` }
  }

  // 检查文件名是否为空
  if (!file.name || file.name.trim() === "") {
    return { valid: false, error: "文件名不能为空" }
  }

  return { valid: true }
}

// 文件上传接口
export function uploadFile(file: File) {
  // 前端预验证
  const validation = validateFile(file)
  if (!validation.valid) {
    return Promise.reject(new Error(validation.error))
  }

  const formData = new FormData()
  formData.append("file", file)
  return request<ApiResponseData<fileData>>({
    url: "/v2/admin/files/upload",
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  })
}

// 获取文件临时访问URL
interface FileAccessUrlResponse {
  url: string
  mime: string
}

export function getFileAccessUrlApi(md5: string) {
  return request<ApiResponseData<FileAccessUrlResponse>>({
    url: "/v2/admin/files/access-url",
    method: "post",
    data: { md5 }
  })
}

// 富文本编辑器-图片上传接口
export function uploadImage(file: File, onProgress?: (percent: number) => void) {
  const formData = new FormData()
  formData.append("file", file)
  // 使用文件大小作为 total 的备选值
  const fileSize = file.size
  return request<ApiResponseData<fileData>>({
    url: "/v2/admin/files/upload-image",
    method: "post",
    data: formData,
    timeout: 60000, // 图片上传超时时间60秒
    silent: "timeout", // 仅超时静默
    headers: {
      "Content-Type": "multipart/form-data"
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        // 优先使用 progressEvent.total，否则使用文件大小
        const total = progressEvent.total || fileSize
        if (total > 0) {
          const percent = Math.round((progressEvent.loaded * 100) / total)
          onProgress(Math.min(percent, 100))
        }
      }
    }
  })
}
