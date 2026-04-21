import { request } from "@/http/axios_n"

interface BackendStaffData {
  nickname: string
  remark: string
  email?: string
  active: boolean
  gender: number
  organizationId?: number
  location?: string
}

export interface BackendStaffModel extends BackendStaffData, BaseModel {
  username: string
  createdDate: string
  lastLoginDate: string
  lastLogin: number
  organizationName?: string
}

// 数据结构 - List
export type BackendStaffListData = ListData<BackendStaffModel[]>

interface ReqBackendStaffList extends PageInfo {
  email?: string
  nickname?: string
  organizationId?: number
}

/** 获取所有事工同工 */
export function getBackendStaffsApi(data: ReqBackendStaffList) {
  return request<ApiResponseData<BackendStaffListData>>({
    url: "/v2/admin/backend-staffs/list",
    method: "post",
    data
  })
}

/** 添加事工同工 */
export function addBackendStaffApi(data: BackendStaffData & { password?: string, username?: string }) {
  return request<ApiResponseData<{ id: number } | null>>({
    url: "/v2/admin/backend-staffs",
    method: "post",
    data
  })
}

/** 编辑事工同工 */
export function editBackendStaffApi(data: BackendStaffData & CId) {
  return request<ApiResponseData<BackendStaffModel>>({
    url: "/v2/admin/backend-staffs",
    method: "put",
    data
  })
}

/** 删除事工同工 */
export function deleteBackendStaffApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/backend-staffs",
    method: "delete",
    data
  })
}

/** 重置事工同工密码 */
export function resetBackendStaffPassApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/backend-staffs/reset-password",
    method: "post",
    data
  })
}

/** 切换事工同工状态 */
export function switchBackendStaffActiveApi(data: { active: boolean } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/switch-active",
    method: "post",
    data
  })
}
