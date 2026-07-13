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

// 收费类型
export enum ActivityFeeType {
  Free = 0,
  Paid = 1
}

export const feeTypeLabelMap: Record<number, string> = {
  [ActivityFeeType.Free]: "免费",
  [ActivityFeeType.Paid]: "收费"
}

// 报名方式
export enum ParticipationType {
  Individual = 1,
  Family = 2
}

export const participationTypeLabelMap: Record<number, string> = {
  [ParticipationType.Individual]: "个人",
  [ParticipationType.Family]: "家庭"
}

// 报名支付状态
export enum PayStatus {
  NoPayNeeded = 0,
  Pending = 1,
  Paid = 2,
  Refunding = 3,
  Refunded = 4,
  Expired = 5,
  OfflinePending = 6
}

export const payStatusLabelMap: Record<number, string> = {
  [PayStatus.NoPayNeeded]: "无需支付",
  [PayStatus.Pending]: "待支付",
  [PayStatus.Paid]: "已支付",
  [PayStatus.Refunding]: "退款中",
  [PayStatus.Refunded]: "已退款",
  [PayStatus.Expired]: "已超时",
  [PayStatus.OfflinePending]: "待线下付款"
}

export const payStatusTagTypeMap: Record<number, string> = {
  [PayStatus.NoPayNeeded]: "info",
  [PayStatus.Pending]: "warning",
  [PayStatus.Paid]: "success",
  [PayStatus.Refunding]: "warning",
  [PayStatus.Refunded]: "info",
  [PayStatus.Expired]: "info",
  [PayStatus.OfflinePending]: "primary"
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
  startTimeStr: string // 北京时间可读格式 "2006-01-02 15:04:05"
  endTimeStr: string // 北京时间可读格式
  description: string
  maxParticipants: number
  registeredCount: number
  status: ActivityStatus
  sortOrder: number
  feeType: ActivityFeeType
  onlinePaymentEnabled: boolean
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
  startTime: string // 格式 "2006-01-02 15:04:05"，北京时间
  endTime?: string // 格式同上
  description?: string
  maxParticipants?: number
  sortOrder?: number
  feeType?: ActivityFeeType
  onlinePaymentEnabled?: boolean
}

export interface ActivitySortItem {
  id: number
  sortOrder: number
}

// 报名参与人
export interface ParticipantItem {
  categoryId: number
  categoryName: string
  price: number
  name: string
}

// 报名人员
export interface RegistrationItem {
  registrationId: number
  userId: number
  nickname: string
  avatar: string
  registeredAt: number
  participationType: ParticipationType
  totalFee: number
  payStatus: PayStatus
  participants: ParticipantItem[]
}

export interface RegistrationListData extends ListData<RegistrationItem[]> {
  totalReceivable: number // 应收总额（分），基于活动全量数据聚合，不受分页影响
  totalReceived: number // 已收总额（分），同上
}

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

/** 导出报名人员名单（CSV，由后端一次性生成全部有效报名，不受分页限制） */
export function exportRegistrationsApi(activityId: number) {
  return request({
    url: `/v2/admin/activities/${activityId}/registrations/export`,
    method: "get",
    responseType: "blob"
  })
}
