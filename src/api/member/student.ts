import { request } from "@/http/axios_n"

interface studentData {
  nickname: string
  // phone: string
  remark: string
  email: string
  active: boolean
  gender: number
  organizationId?: number
  location?: string // 所在地，最大200字符
}

export interface studentDataModel extends studentData, BaseModel {
  createdDate: string
  lastLoginDate: string
  lastLogin: number
  organizationName?: string
}

// 数据结构 - List
export type studentListData = ListData<studentDataModel[]>

interface reqStudentList extends PageInfo {
  email?: string
  nickname?: string
  organizationId?: number
}

/** 获取学员详情 */
export function getStudentInfoApi() {
  return request<ApiResponseData<studentDataModel>>({
    url: "/v2/admin/students/info",
    method: "get"
  })
}

/** 获取所有学员 */
export function getStudentsApi(data: reqStudentList) {
  return request<ApiResponseData<studentListData>>({
    url: "/v2/admin/students/list",
    method: "post",
    data
  })
}

// 删除学员
export function deleteStudentApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/students",
    method: "delete",
    data
  })
}

// 添加学员
export function addStudentApi(data: studentData & { password: string }) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/students",
    method: "post",
    data
  })
}

// 编辑学员
export function editStudentApi(data: studentData & CId) {
  return request<ApiResponseData<studentDataModel>>({
    url: "/v2/admin/students",
    method: "put",
    data
  })
}

// 重置学员密码
interface reqResetPass {
  password: string
}

export function resetPassApi(data: reqResetPass & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/students/reset-password",
    method: "post",
    data
  })
}

// 切换学员状态
export function SwitchActiveApi(data: { active: boolean } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/switch-active",
    method: "post",
    data
  })
}
