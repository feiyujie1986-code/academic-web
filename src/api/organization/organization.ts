import { request } from "@/http/axios_n"

/** 机构数据模型 */
export interface OrganizationModel {
  id: number
  name: string
  remark: string
  createdAt: number
  updatedAt: number
  createdDate?: string
  updatedDate?: string
}

/** 机构列表数据 */
export type OrganizationListData = ListData<OrganizationModel[]>

/** 添加机构参数 */
interface AddOrganizationParams {
  name: string
  remark?: string
}

/** 修改机构参数 */
interface EditOrganizationParams {
  id: number
  name: string
  remark?: string
}

/** 获取机构列表参数 */
interface GetOrganizationsParams extends PageInfo {
  name?: string
}

/** 获取机构列表 */
export function getOrganizationsApi(data: GetOrganizationsParams) {
  return request<ApiResponseData<OrganizationListData>>({
    url: "/v2/admin/organizations/list",
    method: "post",
    data
  })
}

/** 添加机构 */
export function addOrganizationApi(data: AddOrganizationParams) {
  return request<ApiResponseData<OrganizationModel>>({
    url: "/v2/admin/organizations",
    method: "post",
    data
  })
}

/** 修改机构 */
export function editOrganizationApi(data: EditOrganizationParams) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/organizations",
    method: "put",
    data
  })
}

/** 删除机构 */
export function deleteOrganizationApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/organizations",
    method: "delete",
    data
  })
}
