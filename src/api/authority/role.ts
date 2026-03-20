import type { MenuData } from "./menu"
import { request } from "@/http/axios_n"

interface roleData {
  roleName: string
  identity: string
  isSystem?: boolean
  menus?: MenuData[]
}

export interface roleDataModel extends roleData, BaseModel {}

// List
// export type roleListData = ListData<roleDataModel[]>

/** 获取角色列表 */
export function getRolesApi() {
  return request<ApiResponseData<roleDataModel[]>>({
    url: "/v2/admin/roles/list",
    method: "post",
    data: {}
  })
}

export function addRoleApi(data: roleData) {
  return request<ApiResponseData<roleDataModel>>({
    url: "/v2/admin/roles",
    method: "post",
    data
  })
}

export function deleteRoleApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/roles",
    method: "delete",
    data
  })
}

export function editRoleApi(data: roleData & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/roles",
    method: "put",
    data
  })
}

export function editRoleMenuApi(data: { roleId: number } & CIds) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/roles/edit-menu",
    method: "post",
    data
  })
}
