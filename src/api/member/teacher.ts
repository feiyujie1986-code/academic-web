import { request } from "@/http/axios_n"

interface teacherData {
  nickname: string
  // phone: string
  remark: string
  email: string
  active: boolean
  gender: number
  organizationId?: number
  location?: string // 所在地，最大200字符
}

export interface teacherDataModel extends teacherData, BaseModel {
  createdDate: string
  lastLoginDate: string
  lastLogin: number
  organizationName?: string
}

// 数据结构 - List
export type teacherListData = ListData<teacherDataModel[]>

interface reqTeacherList extends PageInfo {
  email?: string
  nickname?: string
  organizationId?: number
}

/** 获取教师详情 */
export function getTeacherInfoApi() {
  return request<ApiResponseData<teacherDataModel>>({
    url: "/v2/admin/teachers/info",
    method: "get"
  })
}

/** 获取所有教师 */
export function getTeachersApi(data: reqTeacherList) {
  return request<ApiResponseData<teacherListData>>({
    url: "/v2/admin/teachers/list",
    method: "post",
    data
  })
}

// 删除教师
export function deleteTeacherApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/teachers",
    method: "delete",
    data
  })
}

// 添加教师
export function addTeacherApi(data: teacherData & { password: string }) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/teachers",
    method: "post",
    data
  })
}

// 编辑教师
export function editTeacherApi(data: teacherData & CId) {
  return request<ApiResponseData<teacherDataModel>>({
    url: "/v2/admin/teachers",
    method: "put",
    data
  })
}

// 重置教师密码
interface reqResetPass {
  password: string
}

export function resetPassApi(data: reqResetPass & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/teachers/reset-password",
    method: "post",
    data
  })
}

// 切换教师状态
export function SwitchActiveApi(data: { active: boolean } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/switch-active",
    method: "post",
    data
  })
}
