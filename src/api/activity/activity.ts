import { request } from "@/http/axios_n"

// ==================== 常量定义 ====================

export enum ActivityStatus {
  Draft = 0,
  Published = 1,
  Cancelled = 2,
  Ended = 3
}

export const activityStatusLabelMap: Record<number, string> = {
  [ActivityStatus.Draft]: "草稿",
  [ActivityStatus.Published]: "已发布",
  [ActivityStatus.Cancelled]: "已取消",
  [ActivityStatus.Ended]: "已结束"
}

export const activityStatusTagTypeMap: Record<number, string> = {
  [ActivityStatus.Draft]: "info",
  [ActivityStatus.Published]: "success",
  [ActivityStatus.Cancelled]: "warning",
  [ActivityStatus.Ended]: "primary"
}

// ==================== 类型定义 ====================

export interface ActivityListItem {
  id: number
  title: string
  categoryId: number
  categoryName: string
  coverImage: string
  location: string
  startTime: number
  endTime: number
  description: string
  maxParticipants: number
  registeredCount: number
  status: ActivityStatus
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export type ActivityListData = ListData<ActivityListItem[]>

export interface ActivityQueryParams extends PageInfo {
  keyword?: string
  categoryId?: number
  status?: ActivityStatus
}

export interface ActivityFormParams {
  title: string
  categoryId: number
  coverImage: string
  location?: string
  startTime: number
  endTime?: number
  description?: string
  maxParticipants?: number
  sortOrder?: number
}

export interface ActivitySortItem {
  id: number
  sortOrder: number
}

// 报名人员
export interface RegistrationItem {
  id: number
  userId: number
  nickname: string
  avatar: string
  registeredAt: number
}

export type RegistrationListData = ListData<RegistrationItem[]>

// ==================== API 函数 ====================

/** 获取活动列表 */
export function getActivityListApi(params: ActivityQueryParams) {
  return request<ApiResponseData<ActivityListData>>({
    url: "/v2/admin/activities",
    method: "get",
    params
  })
}

/** 新增活动 */
export function addActivityApi(data: ActivityFormParams) {
  return request<ApiResponseData<ActivityListItem>>({
    url: "/v2/admin/activities",
    method: "post",
    data
  })
}

/** 编辑活动 */
export function editActivityApi(id: number, data: Partial<ActivityFormParams>) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activities/${id}`,
    method: "put",
    data
  })
}

/** 删除活动 */
export function deleteActivityApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activities/${id}`,
    method: "delete"
  })
}

/** 修改活动状态（发布/取消/结束） */
export function updateActivityStatusApi(id: number, status: ActivityStatus) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activities/${id}/status`,
    method: "put",
    data: { status }
  })
}

/** 批量排序 */
export function sortActivitiesApi(items: ActivitySortItem[]) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/activities/sort",
    method: "put",
    data: { items }
  })
}

/** 获取活动报名人员列表 */
export function getActivityRegistrationsApi(activityId: number, params: PageInfo) {
  return request<ApiResponseData<RegistrationListData>>({
    url: `/v2/admin/activities/${activityId}/registrations`,
    method: "get",
    params
  })
}

/** 移除报名人员 */
export function removeRegistrationApi(activityId: number, userId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activities/${activityId}/registrations/${userId}`,
    method: "delete"
  })
}
