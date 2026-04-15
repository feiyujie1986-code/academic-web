import { request } from "@/http/axios_n"

interface NewStuData {
  nickname: string
  remark: string
  email?: string
  active: boolean
  gender: number
  organizationId?: number
  location?: string
}

export interface NewStuModel extends NewStuData, BaseModel {
  username: string
  createdDate: string
  lastLoginDate: string
  lastLogin: number
  organizationName?: string
}

export type NewStuListData = ListData<NewStuModel[]>

interface ReqNewStuList extends PageInfo {
  email?: string
  nickname?: string
  organizationId?: number
}

/** 获取新人列表 */
export function getNewStudentsApi(data: ReqNewStuList) {
  return request<ApiResponseData<NewStuListData>>({
    url: "/v2/admin/new-stu/list",
    method: "post",
    data
  })
}

/** 删除新人 */
export function deleteNewStudentApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/new-stu",
    method: "delete",
    data
  })
}

/** 新增新人 */
export function addNewStudentApi(data: NewStuData & { password?: string; username?: string }) {
  return request<ApiResponseData<{ id: number } | null>>({
    url: "/v2/admin/new-stu",
    method: "post",
    data
  })
}

/** 编辑新人 */
export function editNewStudentApi(data: NewStuData & CId) {
  return request<ApiResponseData<NewStuModel>>({
    url: "/v2/admin/new-stu",
    method: "put",
    data
  })
}

/** 重置新人密码 */
export function resetNewStudentPassApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/new-stu/reset-password",
    method: "post",
    data
  })
}

/** 切换新人状态 */
export function switchNewStudentActiveApi(data: { active: boolean } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/switch-active",
    method: "post",
    data
  })
}