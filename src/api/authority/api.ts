import { request } from "@/http/axios_n"

interface ApiData {
  path: string
  apiGroup: string
  method: string
  description: string
}

export interface ApiDataModel extends ApiData, BaseModel {}

// 数据结构 - List
export type ApiListData = ListData<ApiDataModel[]>

interface reqApis extends PageInfo {
  path?: string
  apiGroup?: string
  method?: string
  description?: string
  orderKey?: string
  desc?: boolean
}

// 获取所有api 分页
export function getApisApi(data: reqApis) {
  return request<ApiResponseData<ApiListData>>({
    url: "/v2/admin/apis/list",
    method: "post",
    data
  })
}

interface children {
  key: string
  apiGroup: string
  path: string
  method: string
  description: string
}

export interface ApiTreeData {
  apiGroup: string
  children: children[]
}

interface ApiTreeAll {
  list: ApiTreeData[]
  checkedKey: string[]
}

// 获取所有api 不分页
export function getElTreeApisApi(data: CId) {
  return request<ApiResponseData<ApiTreeAll>>({
    url: "/v2/admin/apis/tree",
    method: "post",
    data
  })
}

// 添加api
export function addApiApi(data: ApiData) {
  return request<ApiResponseData<ApiDataModel>>({
    url: "/v2/admin/apis",
    method: "post",
    data
  })
}

// 删除api
export function deleteApiApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/apis",
    method: "delete",
    data
  })
}

// 批量删除api
export function deleteApiByIdApi(data: CIds) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/apis/batch-delete",
    method: "post",
    data
  })
}

// 编辑api
export function editApiApi(data: ApiData & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/apis",
    method: "put",
    data
  })
}
