import { request } from "@/http/axios_n"

// ==================== 常量定义 ====================

// 通知类型
export enum NoticeType {
  System = "system", // 系统通知
  Business = "business", // 业务通知
  Alert = "alert" // 预警通知
}

// 通知分类
export enum NoticeCategory {
  // 课程相关
  LessonSchedule = "lesson_schedule",
  LessonChange = "lesson_change",
  LessonCancel = "lesson_cancel",
  LessonReminder = "lesson_reminder",
  // 作业相关
  AssignmentCreated = "assignment_created",
  AssignmentGraded = "assignment_graded",
  AssignmentDeadline = "assignment_deadline",
  // 资料相关
  MaterialAuthorized = "material_authorized",
  // 账户相关
  AccountActivate = "account_activate",
  AccountChange = "account_change",
  // 预警相关
  AlertUnconfirmed = "alert_unconfirmed",
  AlertInactive = "alert_inactive",
  // 公告相关
  AnnouncementSystem = "announcement_system",
  AnnouncementCommunity = "announcement_community",
  AnnouncementClass = "announcement_class"
}

// 分类中文映射
export const categoryLabelMap: Record<string, string> = {
  lesson_schedule: "课节安排",
  lesson_change: "课节变更",
  lesson_cancel: "课节取消",
  lesson_reminder: "课节提醒",
  assignment_created: "作业发布",
  assignment_graded: "作业批改",
  assignment_deadline: "作业截止",
  material_authorized: "资料授权",
  account_activate: "账户激活",
  account_change: "账户变更",
  alert_unconfirmed: "未确认预警",
  alert_inactive: "不活跃预警",
  announcement_system: "公告",
  announcement_community: "亚社区公告",
  announcement_class: "班级公告"
}

// 通知状态（API 返回的原始状态）
export enum NoticeStatus {
  Active = "active", // 激活/正常
  Cancelled = "cancelled", // 已取消
  Expired = "expired" // 已过期
}

// 显示状态（页面展示用）
export enum NoticeDisplayStatus {
  Draft = "draft", // 待发布
  Scheduled = "scheduled", // 已定时待发布
  Published = "published", // 已发布
  Cancelled = "cancelled", // 已取消
  Expired = "expired" // 已过期
}

// 显示状态中文映射
export const displayStatusLabelMap: Record<string, string> = {
  draft: "待发布",
  scheduled: "已定时待发布",
  published: "已发布",
  cancelled: "已撤回",
  expired: "已过期"
}

// 显示状态样式映射
export const displayStatusStyleMap: Record<string, { type: string, color?: string }> = {
  draft: { type: "info" },
  scheduled: { type: "warning" },
  published: { type: "success" },
  cancelled: { type: "danger" },
  expired: { type: "info" }
}

// 目标类型
export enum TargetType {
  User = "user",
  Role = "role",
  Organization = "organization",
  Class = "class",
  Community = "community",
  All = "all"
}

// 优先级
export enum NoticePriority {
  Normal = 1,
  Important = 2,
  Urgent = 3
}

// ==================== 类型定义 ====================

// 通知列表项
export interface NoticeListItem {
  id: number
  type: string
  category: string
  title: string
  summary: string
  priority: number
  status: string
  senderType: string
  senderId: number
  targetType: string
  targetCount: number
  sentCount: number
  readCount: number
  createdAt: number // 毫秒时间戳
  sentAt: number | null // 毫秒时间戳
  scheduledAt: number | null // 毫秒时间戳
  timezone: string | null // 时区，如 "Asia/Shanghai"
  scheduledTimeStr: string | null // 定时发送时间字符串（基于时区转换，格式：2024-01-23 14:30:00）
}

// 目标用户详情
export interface TargetUserDetail {
  id: number
  nickname: string
  status: number // 0-未激活 1-已激活
}

// 目标班级详情
export interface TargetClassDetail {
  id: number
  name: string
  status: number // 1-未开始 2-进行中 3-已结束
}

// 目标社群详情
export interface TargetCommunityDetail {
  id: number
  name: string
  status: number // 0-已解散 1-正常
}

// 目标详情（根据 targetType 动态变化）
export interface TargetDetails {
  users?: TargetUserDetail[]
  classes?: TargetClassDetail[]
  communities?: TargetCommunityDetail[]
}

// 通知详情
export interface NoticeDetail extends NoticeListItem {
  content: string
  contentType: string
  actionType: string
  actionUrl: string
  bizType: string
  bizId: number
  bizData: any
  channels: string[]
  expireAt: number | null
  targetDetails?: TargetDetails // 发送目标详情
  stats: {
    targetCount: number
    sentCount: number
    deliveredCount: number
    readCount: number
    failedCount: number
    byChannel: Record<string, {
      sent: number
      delivered: number
      failed: number
      read: number
    }>
  }
}

// 通知列表响应
export interface NoticeListData {
  total: number
  list: NoticeListItem[]
}

// 查询参数
export interface NoticeQueryParams {
  page?: number
  pageSize?: number
  keyword?: string // 标题关键词搜索（模糊匹配）
  type?: string
  category?: string
  status?: string
  senderType?: string
  senderId?: number
  targetType?: string
  startTime?: number
  endTime?: number
}

// 发送通知参数
export interface SendNoticeParams {
  type: string
  category: string
  title: string
  content: string
  contentType?: string
  summary?: string
  priority?: number
  targetType: string
  targetIds?: number[]
  targetFilter?: {
    classIds?: number[]
    courseIds?: number[]
    roleIds?: number[]
    organizationIds?: number[]
    excludeUserIds?: number[]
  }
  actionType?: string
  actionUrl?: string
  channels?: string[]
  scheduledAt?: string // 定时发送时间（格式：2024-01-23 14:30:00）
  timezone?: string // 时区（IANA格式），定时发送时必填
  expireAt?: number
}

// 更新通知参数（type 和 category 不可修改）
export interface UpdateNoticeParams {
  title?: string
  content?: string
  contentType?: string
  summary?: string
  priority?: number
  targetType?: string
  targetIds?: number[]
  targetFilter?: {
    classIds?: number[]
    courseIds?: number[]
    roleIds?: number[]
    organizationIds?: number[]
    excludeUserIds?: number[]
  }
  actionType?: string
  actionUrl?: string
  channels?: string[]
  scheduledAt?: string // 定时发送时间（格式：2024-01-23 14:30:00）
  timezone?: string // 时区（IANA格式），定时发送时必填
  expireAt?: number
}

// ==================== 工具函数 ====================

/**
 * 根据 API 返回的数据计算显示状态
 */
export function getDisplayStatus(item: NoticeListItem): NoticeDisplayStatus {
  if (item.status === NoticeStatus.Cancelled) {
    return NoticeDisplayStatus.Cancelled
  }
  if (item.status === NoticeStatus.Expired) {
    return NoticeDisplayStatus.Expired
  }
  // status === active
  if (item.sentAt) {
    return NoticeDisplayStatus.Published
  }
  if (item.scheduledAt) {
    return NoticeDisplayStatus.Scheduled
  }
  return NoticeDisplayStatus.Draft
}

/**
 * 获取分类中文名称
 */
export function getCategoryLabel(category: string): string {
  return categoryLabelMap[category] || category
}

/**
 * 获取显示状态中文名称
 */
export function getDisplayStatusLabel(status: NoticeDisplayStatus): string {
  return displayStatusLabelMap[status] || status
}

// ==================== API 函数 ====================

/**
 * 获取通知列表
 */
export function getNoticesApi(params: NoticeQueryParams) {
  return request<ApiResponseData<NoticeListData>>({
    url: "/v2/admin/notifications",
    method: "get",
    params
  })
}

/**
 * 获取通知详情
 */
export function getNoticeDetailApi(id: number) {
  return request<ApiResponseData<NoticeDetail>>({
    url: `/v2/admin/notifications/${id}`,
    method: "get"
  })
}

/**
 * 发送/新增通知
 */
export function sendNoticeApi(data: SendNoticeParams) {
  return request<ApiResponseData<{
    notificationId: number
    targetCount: number
    status: string
    scheduledAt?: number
  }>>({
    url: "/v2/admin/notifications/send",
    method: "post",
    data
  })
}

/**
 * 取消通知
 */
export function cancelNoticeApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/notifications/${id}/cancel`,
    method: "post"
  })
}

/**
 * 更新通知
 */
export function updateNoticeApi(id: number, data: UpdateNoticeParams) {
  return request<ApiResponseData<{
    notificationId: number
    targetCount: number
    status: string
    scheduledAt?: number
  }>>({
    url: `/v2/admin/notifications/${id}`,
    method: "put",
    data
  })
}

/**
 * 删除通知
 * 只能删除未发送的定时通知或已取消/已过期的通知
 */
export function deleteNoticeApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/notifications/${id}`,
    method: "delete"
  })
}

// 渠道信息
export interface NoticeChannel {
  channel: string
  name: string
  enabled: boolean
}

/**
 * 获取通知渠道列表
 */
export function getNoticeChannelsApi() {
  return request<ApiResponseData<NoticeChannel[]>>({
    url: "/v2/admin/notification-stats/channels",
    method: "get"
  })
}
