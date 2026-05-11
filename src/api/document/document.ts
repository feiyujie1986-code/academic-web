import { request } from "@/http/axios_n"

// ==================== Types ====================

// 文件信息
export interface FileInfo {
  id: number
  filename: string
  fullpath: string
  size: number
  md5: string
  provider?: string
}

// 视频转码状态
export type TranscodeStatus = "pending" | "processing" | "completed" | "failed"

// 视频信息（仅视频文件有此字段）
export interface VideoInfo {
  id: number
  vodVideoId: string
  transcodeStatus: TranscodeStatus
  originalFileMd5: string
}

// 分类信息
export interface CategoryInfo {
  id: number
  name: string
  sort: number
  createdAt?: number
  updatedAt?: number
}

// 资料响应
export interface DocumentResponse {
  id: number
  name: string
  type: 1 | 2 // 1-文件夹 2-文件
  typeName: string
  parentId: number
  categoryId?: number
  category?: CategoryInfo
  description?: string
  sort: number
  file?: FileInfo
  video?: VideoInfo // 视频文件才有，非视频为 null/undefined
  createdBy: number
  createdAt: number
  updatedAt: number
}

// 目录树节点
export interface DocumentTreeNode {
  id: number
  name: string
  type: 1 | 2
  typeName: string
  description?: string
  file?: FileInfo
  children?: DocumentTreeNode[]
}

// 列表响应
export interface DocumentListResponse {
  list: DocumentResponse[]
  total: number
  page: number
  pageSize: number
}

// ==================== Request Types ====================

// 创建文件夹请求
export interface CreateFolderReq {
  name: string
  parentId?: number
  categoryId?: number
  description?: string
}

// 创建文件记录请求 (分片上传后)
export interface CreateFileRecordReq {
  fileId: number
  name?: string
  parentId?: number
  categoryId?: number
  description?: string
  onConflict?: "fail" | "rename" // 冲突处理：fail-报错(默认) / rename-自动重命名
}

// 获取列表请求
export interface GetDocumentsReq {
  page?: number
  pageSize?: number
  parentId?: number
  categoryId?: number
  type?: 1 | 2
  keyword?: string
}

// 更新资料请求
export interface UpdateDocumentReq {
  name?: string
  parentId?: number
  categoryId?: number
  description?: string
  sort?: number
  fileId?: number // 替换文件时使用
}

// 检测重名请求
export interface CheckDuplicatesReq {
  parentId?: number
  names: { name: string, type: 1 | 2 }[]
}

// 重名检测响应中的重名项
export interface DuplicateItem {
  name: string
  type: 1 | 2
  id?: number // 已存在资料的ID，用于替换
}

// 检测重名响应
export interface CheckDuplicatesResponse {
  duplicates: DuplicateItem[]
}

// ==================== API Functions ====================

/**
 * 创建文件夹
 */
export function createFolder(data: CreateFolderReq) {
  return request<ApiResponseData<DocumentResponse>>({
    url: "/v2/admin/documents/folders",
    method: "post",
    data
  })
}

/**
 * 上传文件 (小文件直接上传)
 */
export function uploadFile(
  file: File,
  parentId?: number,
  categoryId?: number,
  description?: string,
  onProgress?: (progress: number) => void,
  onConflict?: "fail" | "rename"
) {
  const formData = new FormData()
  formData.append("file", file)
  if (parentId !== undefined) formData.append("parentId", parentId.toString())
  if (categoryId !== undefined) formData.append("categoryId", categoryId.toString())
  if (description) formData.append("description", description)
  if (onConflict) formData.append("onConflict", onConflict)

  return request<ApiResponseData<DocumentResponse>>({
    url: "/v2/admin/documents/files",
    method: "post",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5分钟超时
    onUploadProgress: onProgress
      ? (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(percent)
          }
        }
      : undefined
  })
}

/**
 * 创建文件记录 (分片上传完成后)
 */
export function createFileRecord(data: CreateFileRecordReq) {
  return request<ApiResponseData<DocumentResponse>>({
    url: "/v2/admin/documents/files/record",
    method: "post",
    data
  })
}

/**
 * 获取资料列表
 */
export function getDocuments(params: GetDocumentsReq) {
  return request<ApiResponseData<DocumentListResponse>>({
    url: "/v2/admin/documents",
    method: "get",
    params
  })
}

/**
 * 获取目录树
 */
export function getDocumentTree() {
  return request<ApiResponseData<DocumentTreeNode[]>>({
    url: "/v2/admin/documents/tree",
    method: "get"
  })
}

/**
 * 获取文件夹树 (仅文件夹，用于移动)
 */
export function getFolderTree() {
  return request<ApiResponseData<DocumentTreeNode[]>>({
    url: "/v2/admin/documents/folder-tree",
    method: "get"
  })
}

/**
 * 获取资料详情
 */
export function getDocument(id: number) {
  return request<ApiResponseData<DocumentResponse>>({
    url: `/v2/admin/documents/${id}`,
    method: "get"
  })
}

/**
 * 更新资料
 */
export function updateDocument(id: number, data: UpdateDocumentReq) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/documents/${id}`,
    method: "put",
    data
  })
}

/**
 * 删除资料
 */
export function deleteDocument(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/documents/${id}`,
    method: "delete"
  })
}

/**
 * 查询视频转码进度
 * 视频上传后 Cloudflare Stream 异步转码，轮询此接口直到 transcodeStatus 为 completed
 */
export function getVideoProgress(videoId: number) {
  return request<ApiResponseData<{ id: number, transcodeStatus: TranscodeStatus }>>({
    url: `/v2/admin/videos/${videoId}/progress`,
    method: "get",
    silent: true
  })
}

/**
 * 批量检测重名
 * 检测指定目录下是否存在同名同类型的资料
 */
export function checkDuplicates(data: CheckDuplicatesReq) {
  return request<ApiResponseData<CheckDuplicatesResponse>>({
    url: "/v2/admin/documents/check-duplicates",
    method: "post",
    data
  })
}
