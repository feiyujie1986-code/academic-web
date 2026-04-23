import { request } from "@/http/axios_n"

// 会话类型
export enum ConversationType {
  SingleChat = 0, // 单聊
  NormalGroup = 1, // 普通群
  AnnouncementGroup = 2 // 公告群
}

// 会话来源
export enum ConversationSource {
  None = 0, // 无来源(普通用户单聊)
  Class = 1, // 班级群
  Temporary = 2, // 临时群
  Community = 3, // 社区群
  System = 4 // 系统消息单聊
}

// 同步状态
export enum SyncStatus {
  Pending = 0, // 待同步
  Synced = 1, // 已同步
  Failed = 2, // 同步失败
  MaxRetryExceeded = 3 // 超过最大重试次数
}

// 群组模型
export interface ConversationModel {
  id: number
  communityId: number
  communityName: string
  name: string
  isGroup?: boolean
  type: ConversationType
  typeName: string
  source: ConversationSource
  sourceName: string
  sourceId: number
  avatar: string
  announcement?: string
  ownerUserId: number
  ownerName: string
  memberCount: number
  memberVersion?: number
  maxMembers: number
  muteAll: number
  roomBareJid?: string
  syncStatus: SyncStatus
  syncStatusName: string
  syncError?: string
  status: number
  createdAt: number
  updatedAt?: number
}

// 群组列表响应
export interface ConversationListData {
  list: ConversationModel[]
  total: number
  page: number
  pageSize: number
}

// 群成员模型
export interface ConversationMember {
  id: number
  userId: number
  userName: string
  userAvatar: string
  userRole: string
  userRoleName: string
  memberRole: number // 0=普通成员, 1=群主, 2=管理员
  memberRoleName: string
  nickname: string
  muted: number
  muteEndTime: number | null
  joinedAt: number
  syncStatus: SyncStatus
  syncStatusName: string
  isOrgLeader?: boolean
  isClassMonitor?: boolean
}

// 群成员列表响应
export interface ConversationMemberListData {
  list: ConversationMember[]
  total: number
  page: number
  pageSize: number
  version?: number
  hasMore?: boolean
}

// 按角色分组的群成员
export interface GroupedConversationMember {
  id: number
  memberId: number
  userId: number
  nickname: string
  avatar: string
  email: string
  roleIdentity: string
  roleName: string
}

// 群成员角色分组
export interface ConversationMemberGroup {
  roleIdentity: string
  roleName: string
  count: number
  members: GroupedConversationMember[]
}

// 群成员候选人
export interface ConversationMemberCandidate {
  userId: number
  nickname: string
  avatar: string
  email: string
  userRole: string
  roleName: string
  isOrgLeader: boolean
}

// 命中用户（昵称搜索时返回）
export interface MatchedUser {
  userId: number
  nickname: string
  avatar: string
  email: string
  active: boolean
}

// 搜索响应（含可选 matchedUsers）
export interface ConversationSearchData extends ConversationListData {
  matchedUsers?: MatchedUser[]
}

// 历史消息
export interface MessageItem {
  id: string
  fromUserId: number
  fromNickname: string
  fromAvatar: string
  content: string
  timestamp: string
  rawStanza: string
}

// 历史消息响应
export interface MessagesData {
  list: MessageItem[]
  cursor: string
  hasMore: boolean
}

// 查询群组列表参数
export interface GetConversationsParams {
  communityId?: number
  type?: ConversationType
  source?: ConversationSource
  syncStatus?: SyncStatus
  status?: number
  keyword?: string
  memberNickname?: string
  page?: number
  pageSize?: number
}

// 获取群组列表
export function getConversationsApi(params: GetConversationsParams) {
  return request<ApiResponseData<ConversationSearchData>>({
    url: "/v2/admin/im/conversations",
    method: "get",
    params
  })
}

// 获取群组详情
export function getConversationDetailApi(id: number) {
  return request<ApiResponseData<ConversationModel>>({
    url: `/v2/admin/im/conversations/${id}`,
    method: "get"
  })
}

// 创建群组参数
export interface CreateConversationParams {
  communityId: number
  name: string
  isGroup?: boolean
  type?: ConversationType
  source?: ConversationSource
  sourceId?: number
  avatar?: string
  ownerUserId?: number
  memberUserIds?: number[]
}

// 创建群组
export function createConversationApi(data: CreateConversationParams) {
  return request<ApiResponseData<ConversationModel>>({
    url: "/v2/admin/im/conversations",
    method: "post",
    data
  })
}

// 更新群组参数
export interface UpdateConversationParams {
  name?: string
  avatar?: string
  announcement?: string
  muteAll?: number
}

// 更新群组
export function updateConversationApi(id: number, data: UpdateConversationParams) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${id}`,
    method: "put",
    data
  })
}

// 删除群组
export function deleteConversationApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${id}`,
    method: "delete"
  })
}

// 查询群成员参数
export interface GetConversationMembersParams {
  role?: number
  syncStatus?: SyncStatus
  keyword?: string
  page?: number
  pageSize?: number
}

// 获取群成员列表
export function getConversationMembersApi(conversationId: number, params: GetConversationMembersParams) {
  return request<ApiResponseData<ConversationMemberListData>>({
    url: `/v2/admin/im/conversations/${conversationId}/members`,
    method: "get",
    params
  })
}

// 添加群成员
export function addConversationMembersApi(conversationId: number, userIds: number[]) {
  return request<ApiResponseData<{ added: number, skipped: number }>>({
    url: `/v2/admin/im/conversations/${conversationId}/members`,
    method: "post",
    data: { userIds }
  })
}

// 更新群成员
export function updateConversationMemberApi(conversationId: number, memberId: number, data: {
  role?: number
  nickname?: string
  muted?: number
  muteEndTime?: number
}) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/members/${memberId}`,
    method: "put",
    data
  })
}

// 移除群成员
export function removeConversationMemberApi(conversationId: number, memberId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/members/${memberId}`,
    method: "delete"
  })
}

// 获取群成员按角色分组
export function getConversationMembersGroupedApi(conversationId: number) {
  return request<ApiResponseData<{ groups: ConversationMemberGroup[], total: number }>>({
    url: `/v2/admin/im/conversations/${conversationId}/members/grouped`,
    method: "get"
  })
}

// 获取群成员候选人
export function getConversationMemberCandidatesApi(conversationId: number, params: {
  keyword?: string
  page?: number
  pageSize?: number
}) {
  return request<ApiResponseData<{ list: ConversationMemberCandidate[], total: number, page: number, pageSize: number }>>({
    url: `/v2/admin/im/conversations/${conversationId}/members/candidates`,
    method: "get",
    params
  })
}

// 同步群组
export function syncConversationApi(conversationId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/sync`,
    method: "post"
  })
}

// 同步群成员
export function syncConversationMemberApi(conversationId: number, memberId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/members/${memberId}/sync`,
    method: "post"
  })
}

// 归档群组
export function archiveConversationApi(conversationId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/archive`,
    method: "post"
  })
}

// 解散群组
export function dissolveConversationApi(conversationId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/dissolve`,
    method: "post"
  })
}

// 单人禁言
export function muteMemberApi(conversationId: number, memberId: number, duration: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/members/${memberId}/mute`,
    method: "post",
    data: { duration }
  })
}

// 解除单人禁言
export function unmuteMemberApi(conversationId: number, memberId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/members/${memberId}/mute`,
    method: "delete"
  })
}

// 获取历史消息
export function getConversationMessagesApi(conversationId: number, params: { before?: string, limit?: number }) {
  return request<ApiResponseData<MessagesData>>({
    url: `/v2/admin/im/conversations/${conversationId}/messages`,
    method: "get",
    params
  })
}

// 删除消息
export function deleteConversationMessageApi(conversationId: number, messageId: string) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/conversations/${conversationId}/messages/${messageId}`,
    method: "delete"
  })
}
