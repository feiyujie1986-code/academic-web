import { request } from "@/http/axios_n"

// 社区类型
export enum CommunityType {
  Training = 1, // 培训社区
  Cooperation = 2, // 合作社区
  Employee = 3 // 员工社区
}

// 社区类型名称映射
export const CommunityTypeLabels: Record<CommunityType, string> = {
  [CommunityType.Training]: "培训社区",
  [CommunityType.Cooperation]: "合作社区",
  [CommunityType.Employee]: "员工社区"
}

// 社区类型描述
export const CommunityTypeDescriptions: Record<CommunityType, string> = {
  [CommunityType.Training]: "面向学员的培训教学社区，不同合作机构间数据隔离",
  [CommunityType.Cooperation]: "面向合作机构的交流社区，确保商业数据互不可见",
  [CommunityType.Employee]: "面向内部员工的沟通社区，用于日常工作交流"
}

// 可见性
export enum Visibility {
  Public = 1, // 公开
  Private = 2 // 私密
}

// 社区模型
export interface CommunityModel {
  id: number
  name: string
  orgId: number
  orgName: string
  type: CommunityType
  typeName: string
  visibility: Visibility
  visibilityName: string
  avatar: string
  description: string
  ownerUserId: number
  ownerName: string
  memberCount: number
  conversationCount: number
  status: number
  createdAt: number
  updatedAt: number
}

// 社区列表响应
export interface CommunityListData {
  list: CommunityModel[]
  total: number
  page: number
  pageSize: number
}

// 社区统计数据
export interface CommunityStatistics {
  training: {
    communityCount: number
    uniqueMemberCount: number
    conversationCount: number
  }
  cooperation: {
    communityCount: number
    uniqueMemberCount: number
    conversationCount: number
  }
  employee: {
    communityCount: number
    uniqueMemberCount: number
    conversationCount: number
  }
}

// 社区成员
export interface CommunityMember {
  id: number
  userId: number
  userName: string
  userAvatar: string
  userType: number
  userTypeName: string
  role: number
  userRole: string
  userRoleName: string
  nickname: string
  joinedAt: number
}

// 社区成员列表响应
export interface CommunityMemberListData {
  list: CommunityMember[]
  total: number
  page: number
  pageSize: number
}

// 按角色分组的成员
export interface GroupedMember {
  id: number
  userId: number
  nickname: string
  avatar: string
  email: string
  roleIdentity: string
  roleName: string
}

// 角色分组
export interface MemberGroup {
  roleIdentity: string
  roleName: string
  count: number
  members: GroupedMember[]
}

// 成员候选人
export interface MemberCandidate {
  userId: number
  nickname: string
  avatar: string
  email: string
  userRole: string
  userRoleName: string
}

// 查询社区列表参数
export interface GetCommunitiesParams {
  orgId?: number
  type?: CommunityType
  visibility?: Visibility
  keyword?: string
  page?: number
  pageSize?: number
}

// 获取社区列表
export function getCommunitiesApi(params: GetCommunitiesParams) {
  return request<ApiResponseData<CommunityListData>>({
    url: "/v2/admin/im/communities",
    method: "get",
    params
  })
}

// 获取社区详情
export function getCommunityDetailApi(id: number) {
  return request<ApiResponseData<CommunityModel>>({
    url: `/v2/admin/im/communities/${id}`,
    method: "get"
  })
}

// 获取社区统计数据
export function getCommunityStatisticsApi() {
  return request<ApiResponseData<CommunityStatistics>>({
    url: "/v2/admin/im/communities/statistics",
    method: "get"
  })
}

// 创建社区参数
export interface CreateCommunityParams {
  name: string
  orgId?: number
  type: CommunityType
  visibility?: Visibility
  avatar?: string
  description?: string
  ownerUserId?: number
}

// 创建社区
export function createCommunityApi(data: CreateCommunityParams) {
  return request<ApiResponseData<CommunityModel>>({
    url: "/v2/admin/im/communities",
    method: "post",
    data
  })
}

// 更新社区参数
export interface UpdateCommunityParams {
  name?: string
  visibility?: Visibility
  avatar?: string
  description?: string
}

// 更新社区
export function updateCommunityApi(id: number, data: UpdateCommunityParams) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/communities/${id}`,
    method: "put",
    data
  })
}

// 删除社区
export function deleteCommunityApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/communities/${id}`,
    method: "delete"
  })
}

// 查询社区成员参数
export interface GetCommunityMembersParams {
  userType?: number
  role?: number
  keyword?: string
  page?: number
  pageSize?: number
}

// 获取社区成员列表
export function getCommunityMembersApi(communityId: number, params: GetCommunityMembersParams) {
  return request<ApiResponseData<CommunityMemberListData>>({
    url: `/v2/admin/im/communities/${communityId}/members`,
    method: "get",
    params
  })
}

// 添加社区成员参数
export interface AddCommunityMemberParams {
  userId: number
  userType?: number
  role?: number
  nickname?: string
}

// 添加社区成员
export function addCommunityMembersApi(communityId: number, members: AddCommunityMemberParams[]) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/communities/${communityId}/members`,
    method: "post",
    data: { members }
  })
}

// 更新社区成员
export function updateCommunityMemberApi(communityId: number, memberId: number, data: {
  userType?: number
  role?: number
  nickname?: string
}) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/communities/${communityId}/members/${memberId}`,
    method: "put",
    data
  })
}

// 移除社区成员
export function removeCommunityMemberApi(communityId: number, memberId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/communities/${communityId}/members/${memberId}`,
    method: "delete"
  })
}

// 获取社区成员按角色分组
export function getCommunityMembersGroupedApi(communityId: number) {
  return request<ApiResponseData<{ groups: MemberGroup[], total: number }>>({
    url: `/v2/admin/im/communities/${communityId}/members/grouped`,
    method: "get"
  })
}

// 获取社区成员候选人
export function getCommunityMemberCandidatesApi(communityId: number, params: {
  keyword?: string
  page?: number
  pageSize?: number
}) {
  return request<ApiResponseData<{ list: MemberCandidate[], total: number, page: number, pageSize: number }>>({
    url: `/v2/admin/im/communities/${communityId}/members/candidates`,
    method: "get",
    params
  })
}
