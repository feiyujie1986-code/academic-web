import { request } from "@/http/axios_n"

// 教学反馈数据模型
export interface TeachingFeedbackDataModel extends BaseModel {
  content: string
  typeId: number
  typeName: string
  submitterName: string
  submitterEmail: string
}

// 列表响应
export type TeachingFeedbackListData = ListData<TeachingFeedbackDataModel[]>

// 获取教学反馈列表
export function getTeachingFeedbacksApi(params: PageInfo) {
  return request<ApiResponseData<TeachingFeedbackListData>>({
    url: "/v2/admin/teaching-feedbacks",
    method: "get",
    params
  })
}

// 获取教学反馈详情
export function getTeachingFeedbackDetailApi(id: number) {
  return request<ApiResponseData<TeachingFeedbackDataModel>>({
    url: `/v2/admin/teaching-feedbacks/${id}`,
    method: "get"
  })
}

// 删除教学反馈
export function deleteTeachingFeedbackApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/teaching-feedbacks/${id}`,
    method: "delete"
  })
}
