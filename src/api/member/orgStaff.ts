import { request } from "@/http/axios_n"

interface OrgStaffData {
  email: string
  nickname?: string
  remark?: string
  gender?: number
  location?: string // 所在地，最大200字符
  organizationId: number // 机构ID，必填
  active?: boolean
}

export interface OrgStaffModel extends OrgStaffData, BaseModel {
  createdDate: string
  lastLoginDate: string
  lastLogin: number
  organizationName: string
}

// 数据结构 - List
export type OrgStaffListData = ListData<OrgStaffModel[]>

interface ReqOrgStaffList extends PageInfo {
  email?: string
  nickname?: string
  organizationId?: number
}

/** 获取机构人员列表 */
export function getOrgStaffsApi(data: ReqOrgStaffList) {
  return request<ApiResponseData<OrgStaffListData>>({
    url: "/v2/admin/org-staffs/list",
    method: "post",
    data
  })
}

/** 添加机构人员 */
export function addOrgStaffApi(data: OrgStaffData & { password: string }) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/org-staffs",
    method: "post",
    data
  })
}

/** 编辑机构人员 */
export function editOrgStaffApi(data: OrgStaffData & CId) {
  return request<ApiResponseData<OrgStaffModel>>({
    url: "/v2/admin/org-staffs",
    method: "put",
    data
  })
}

/** 删除机构人员 */
export function deleteOrgStaffApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/org-staffs",
    method: "delete",
    data
  })
}

/** 重置机构人员密码 */
export function resetOrgStaffPassApi(data: { password: string } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/org-staffs/reset-password",
    method: "post",
    data
  })
}

/** 切换机构人员状态 */
export function switchOrgStaffActiveApi(data: { active: boolean } & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/users/switch-active",
    method: "post",
    data
  })
}
