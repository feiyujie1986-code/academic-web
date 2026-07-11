import { request } from "@/http/axios_n"

// ==================== 类型定义 ====================

// 收费类别（挂在具体活动下，与"活动分类" category.ts 是完全不同的概念，不要混用）
export interface FeeCategoryItem {
  id: number
  name: string
  price: number // 单价，单位分
  sortOrder: number
}

export interface FeeCategoryListData {
  list: FeeCategoryItem[]
}

export interface FeeCategoryFormParams {
  name: string
  price: number
  sortOrder?: number
}

// ==================== API 函数 ====================

/** 查看某活动的收费类别 */
export function getFeeCategoriesApi(activityId: number) {
  return request<ApiResponseData<FeeCategoryListData>>({
    url: `/v2/admin/activities/${activityId}/fee-categories`,
    method: "get"
  })
}

/** 新增收费类别 */
export function createFeeCategoryApi(activityId: number, data: FeeCategoryFormParams) {
  return request<ApiResponseData<FeeCategoryItem>>({
    url: `/v2/admin/activities/${activityId}/fee-categories`,
    method: "post",
    data
  })
}

/** 编辑收费类别 */
export function editFeeCategoryApi(activityId: number, feeCategoryId: number, data: Partial<FeeCategoryFormParams>) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activities/${activityId}/fee-categories/${feeCategoryId}`,
    method: "put",
    data
  })
}

/** 删除收费类别 */
export function deleteFeeCategoryApi(activityId: number, feeCategoryId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activities/${activityId}/fee-categories/${feeCategoryId}`,
    method: "delete"
  })
}
