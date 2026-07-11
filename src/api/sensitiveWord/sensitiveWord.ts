import { request } from "@/http/axios_n"

// ==================== 常量定义 ====================

// 状态
export enum SensitiveWordStatus {
  Active = 1, // 启用
  Inactive = 2 // 禁用
}

// 状态中文映射
export const statusLabelMap: Record<number, string> = {
  [SensitiveWordStatus.Active]: "启用",
  [SensitiveWordStatus.Inactive]: "禁用"
}

// 来源
export type SensitiveWordSource = "default" | "manual"

// 来源中文映射
export const sourceLabelMap: Record<SensitiveWordSource, string> = {
  default: "内置词库",
  manual: "手动添加"
}

// ==================== 类型定义 ====================

// 敏感词列表项
export interface SensitiveWordItem {
  id: number
  word: string
  source: SensitiveWordSource
  status: SensitiveWordStatus
  createdAt: number
  updatedAt: number
}

// 敏感词列表响应
export type SensitiveWordListData = ListData<SensitiveWordItem[]>

// 查询参数
export interface SensitiveWordQueryParams extends PageInfo {
  keyword?: string
  status?: SensitiveWordStatus
}

// ==================== API 函数 ====================

/** 获取敏感词列表 */
export function getSensitiveWordListApi(params: SensitiveWordQueryParams) {
  return request<ApiResponseData<SensitiveWordListData>>({
    url: "/v2/admin/sensitive-words",
    method: "get",
    params
  })
}

/** 切换启用/禁用（立即热更新过滤器） */
export function updateSensitiveWordStatusApi(id: number, status: SensitiveWordStatus) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/sensitive-words/${id}/status`,
    method: "put",
    data: { status }
  })
}

/** 手动重新加载过滤器（用于外部直接改库后手动刷新） */
export function reloadSensitiveWordsApi() {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/sensitive-words/reload",
    method: "post"
  })
}
