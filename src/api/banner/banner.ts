import { request } from "@/http/axios_n"

// ==================== 常量定义 ====================

// 跳转类型
export enum BannerLinkType {
  None = 0, // 不跳转
  Activity = 1, // 活动
  Course = 2, // 课程
  Note = 3, // 笔记
  Community = 4, // 社群（含加群）
  Url = 5 // 外部链接
}

// 跳转类型中文映射
export const linkTypeLabelMap: Record<number, string> = {
  [BannerLinkType.None]: "不跳转",
  [BannerLinkType.Activity]: "活动",
  [BannerLinkType.Note]: "笔记",
  [BannerLinkType.Community]: "社群",
  [BannerLinkType.Url]: "外部链接"
}

// 状态
export enum BannerStatus {
  Active = 1, // 启用
  Inactive = 2 // 禁用
}

// 状态中文映射
export const statusLabelMap: Record<number, string> = {
  [BannerStatus.Active]: "启用",
  [BannerStatus.Inactive]: "禁用"
}

// ==================== 类型定义 ====================

// Banner 列表项
export interface BannerListItem {
  id: number
  title: string
  subtitle: string
  imageUrl: string
  linkType: BannerLinkType
  linkTarget: string
  sortOrder: number
  status: BannerStatus
  startTime: number // 秒级时间戳，0 表示不限制
  endTime: number // 秒级时间戳，0 表示不限制
  createdAt: number
  updatedAt: number
}

// Banner 列表响应
export type BannerListData = ListData<BannerListItem[]>

// 查询参数
export interface BannerQueryParams extends PageInfo {
  status?: BannerStatus
  keyword?: string
}

// 新增/编辑参数
export interface BannerFormParams {
  title?: string
  subtitle?: string
  imageUrl: string
  linkType?: BannerLinkType
  linkTarget?: string
  sortOrder?: number
  status?: BannerStatus
  startTime?: number
  endTime?: number
}

// 排序项
export interface BannerSortItem {
  id: number
  sortOrder: number
}

// ==================== API 函数 ====================

/** 获取 Banner 列表 */
export function getBannerListApi(params: BannerQueryParams) {
  return request<ApiResponseData<BannerListData>>({
    url: "/v2/admin/banners",
    method: "get",
    params
  })
}

/** 新增 Banner */
export function addBannerApi(data: BannerFormParams) {
  return request<ApiResponseData<BannerListItem>>({
    url: "/v2/admin/banners",
    method: "post",
    data
  })
}

/** 编辑 Banner */
export function editBannerApi(id: number, data: Partial<BannerFormParams>) {
  return request<ApiResponseData<BannerListItem>>({
    url: `/v2/admin/banners/${id}`,
    method: "put",
    data
  })
}

/** 删除 Banner */
export function deleteBannerApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/banners/${id}`,
    method: "delete"
  })
}

/** 启用/禁用 Banner */
export function updateBannerStatusApi(id: number, status: BannerStatus) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/banners/${id}/status`,
    method: "put",
    data: { status }
  })
}

/** 批量排序 */
export function sortBannersApi(items: BannerSortItem[]) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/banners/sort",
    method: "put",
    data: { items }
  })
}
