import { request } from "@/http/axios_n"

interface userData {
  nickname: string
  email?: string
  active: boolean
  gender: number
}

interface roleData {
  id: number
  roleName: string
  identity: string
}

export interface userDataModel extends userData, BaseModel {
  username: string
  roles: roleData[]
  createdDate: string
  userType: number
}

// 数据结构 - List
export type userListData = ListData<userDataModel[]>

/** 获取用户详情 */
export function getUserInfoApi() {
  return request<ApiResponseData<userDataModel>>({
    url: "/v2/admin/users/info",
    method: "get"
  })
}

/** 获取所有用户 */
export function getUsersApi(data: PageInfo) {
  return request<ApiResponseData<userListData>>({
    url: "/v2/admin/users/list",
    method: "post",
    data
  })
}

// 删除用户
export function deleteUserApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users",
    method: "delete",
    data
  })
}

// 添加用户
export function addUserApi(data: userData & { password?: string, username?: string, roleIds: number[] }) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users",
    method: "post",
    data
  })
}

// 编辑用户
export function editUserApi(data: userData & { roleIds: number[] } & CId) {
  return request<ApiResponseData<userDataModel>>({
    url: "/v2/admin/users",
    method: "put",
    data
  })
}

// 修改用户密码
interface reqModifyPass {
  oldPassword: string
  newPassword: string
}

export function modifyPassApi(data: reqModifyPass & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/modify-pass",
    method: "post",
    data
  })
}

// 切换用户状态
export function SwitchActiveApi(data: { active: boolean } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/switch-active",
    method: "post",
    data
  })
}
// 切换高级教师状态
export function SwitchSeniorTeacherApi(data: { status: boolean } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/switch-senior-teacher",
    method: "post",
    data
  })
}

// ==================== 用户候选列表（通知系统用）====================

// 角色信息
export interface RoleInfo {
  roleId: number
  roleIdentifier: string
  roleName: string
}

// 用户候选项
export interface UserCandidate {
  id: number
  nickname: string
  email: string
  avatar: string
  active: boolean
  roles: RoleInfo[]
}

// 用户候选列表响应
export interface UserCandidateListData {
  total: number
  list: UserCandidate[]
}

// 获取用户候选列表参数
export interface GetUserCandidatesParams {
  roleIds?: string // 角色ID列表，逗号分隔
  page?: number
  pageSize?: number
}

/** 获取用户候选列表（按角色筛选） */
export function getUserCandidatesApi(params: GetUserCandidatesParams) {
  return request<ApiResponseData<UserCandidateListData>>({
    url: "/v2/admin/users/candidates",
    method: "get",
    params
  })
}
