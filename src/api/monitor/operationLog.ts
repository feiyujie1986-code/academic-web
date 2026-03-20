import { request } from "@/http/axios_n"

interface orData {
  ip: string
  method: string
  path: string
  status: number
  userAgent: string
  reqParam: string
  respData: string
  respTime: number
  userName: string
}

export interface orDataModel extends orData, BaseModel {}

// 数据结构 - List
type orListData = ListData<orDataModel[]>

interface reqOrList extends PageInfo {
  path?: string
  method?: string
  status?: number
  asc?: boolean
}

// 分页获取操作记录
export function getOrListApi(data: reqOrList) {
  return request<ApiResponseData<orListData>>({
    url: "/v2/admin/operation-logs",
    method: "get",
    params: data
  })
}

// 删除操作记录
export function deleteOrApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/operation-logs/${id}`,
    method: "delete"
  })
}

// 批量删除操作记录
export function deleteOrByIdsApi(data: CIds) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/operation-logs/batch",
    method: "delete",
    data
  })
}
