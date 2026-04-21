import { request } from "@/http/axios_n"

export interface MemberGroup {
  groupType: "org" | "role"
  groupId: number
  groupName: string
  count: number
}

export interface MemberGroupIndex {
  uniqueCount: number
  groups: MemberGroup[]
}

export interface GroupMember {
  id: number
  username: string
  nickname: string
  email: string
  gender: number
  active: boolean
  userType: number
  userTypeLabels: string[]
  organizationId: number | null
  organizationName: string
  isOrgLeader: boolean
}

export interface GroupMembersData {
  groupType: string
  groupId: number
  groupName: string
  total: number
  page: number
  pageSize: number
  members: GroupMember[]
}

interface ReqGroupIndex {
  nickname?: string
  email?: string
}

interface ReqGroupMembers {
  page?: number
  pageSize?: number
  nickname?: string
  email?: string
}

/** 获取分组索引（第一阶段，仅组头和人数） */
export function getMemberGroupsApi(params: ReqGroupIndex) {
  return request<ApiResponseData<MemberGroupIndex>>({
    url: "/v2/admin/members/groups",
    method: "get",
    params
  })
}

/** 获取分组成员列表（第二阶段，懒加载） */
export function getMemberGroupMembersApi(groupType: string, groupId: number, params: ReqGroupMembers) {
  return request<ApiResponseData<GroupMembersData>>({
    url: `/v2/admin/members/groups/${groupType}/${groupId}/members`,
    method: "get",
    params
  })
}
