import { request } from "@/http/axios_n"

interface seniorTeacherData {
  nickname: string
  remark: string
  email?: string
  active: boolean
  gender: number
  organizationId?: number
  location?: string
}

export interface seniorTeacherDataModel extends seniorTeacherData, BaseModel {
  username: string
  createdDate: string
  lastLoginDate: string
  lastLogin: number
  organizationName?: string
}

// 数据结构 - List
export type seniorTeacherListData = ListData<seniorTeacherDataModel[]>

interface reqTeacherList extends PageInfo {
  email?: string
  nickname?: string
  organizationId?: number
}

/** 获取大使详情 */
export function getTeacherInfoApi() {
  return request<ApiResponseData<seniorTeacherDataModel>>({
    url: "/v2/admin/senior-teachers/info",
    method: "get"
  })
}

/** 获取所有大使 */
export function getTeachersApi(data: reqTeacherList) {
  return request<ApiResponseData<seniorTeacherListData>>({
    url: "/v2/admin/senior-teachers/list",
    method: "post",
    data
  })
}

// 删除大使
export function deleteTeacherApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/senior-teachers",
    method: "delete",
    data
  })
}

// 添加大使
export function addTeacherApi(data: seniorTeacherData & { password?: string, username?: string }) {
  return request<ApiResponseData<{ id: number } | null>>({
    url: "/v2/admin/senior-teachers",
    method: "post",
    data
  })
}

// 编辑大使
export function editTeacherApi(data: seniorTeacherData & CId) {
  return request<ApiResponseData<seniorTeacherDataModel>>({
    url: "/v2/admin/senior-teachers",
    method: "put",
    data
  })
}

// 重置大使密码
export function resetPassApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/senior-teachers/reset-password",
    method: "post",
    data
  })
}

// 切换大使状态
export function SwitchActiveApi(data: { active: boolean } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/switch-active",
    method: "post",
    data
  })
}
