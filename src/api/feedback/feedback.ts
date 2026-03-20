import { request } from "@/http/axios_n"

// 反馈类型枚举
export enum FeedbackType {
  Bug = 1,
  Suggestion = 2,
  Other = 3
}

export const FeedbackTypeMap: Record<FeedbackType, string> = {
  [FeedbackType.Bug]: "Bug",
  [FeedbackType.Suggestion]: "建议",
  [FeedbackType.Other]: "其他"
}

// 反馈数据模型
export interface FeedbackDataModel extends BaseModel {
  type: FeedbackType
  typeName: string
  description: string
  images: string[]
  logUrl: string
  submitterName: string
  submitterEmail: string
}

// 列表请求参数
interface ReqFeedbackList extends PageInfo {
  type?: FeedbackType
}

// 列表响应
export type FeedbackListData = ListData<FeedbackDataModel[]>

// 获取反馈列表
export function getFeedbacksApi(params: ReqFeedbackList) {
  return request<ApiResponseData<FeedbackListData>>({
    url: "/v2/admin/feedbacks",
    method: "get",
    params
  })
}

// 获取反馈详情
export function getFeedbackDetailApi(id: number) {
  return request<ApiResponseData<FeedbackDataModel>>({
    url: `/v2/admin/feedbacks/${id}`,
    method: "get"
  })
}

// 删除反馈
export function deleteFeedbackApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/feedbacks/${id}`,
    method: "delete"
  })
}
