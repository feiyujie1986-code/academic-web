import { request } from "@/http/axios_n"

// ==================== 常量定义 ====================

export enum CategoryStatus {
  Active = 1,
  Inactive = 2
}

export const categoryStatusLabelMap: Record<number, string> = {
  [CategoryStatus.Active]: "启用",
  [CategoryStatus.Inactive]: "禁用"
}

// ==================== 类型定义 ====================

export interface ActivityCategoryItem {
  id: number
  name: string
  sortOrder: number
  status: CategoryStatus
  createdAt: number
  updatedAt: number
}

export type ActivityCategoryListData = ListData<ActivityCategoryItem[]>

export interface CategoryQueryParams extends PageInfo {
  keyword?: string
  status?: CategoryStatus
}

export interface CategoryFormParams {
  name: string
  sortOrder?: number
  status?: CategoryStatus
}

// ==================== API 函数 ====================

/** 获取分类列表（分页） */
export function getCategoryListApi(params: CategoryQueryParams) {
  return request<ApiResponseData<ActivityCategoryListData>>({
    url: "/v2/admin/activity-categories",
    method: "get",
    params
  })
}

/** 获取所有启用分类（用于下拉选择） */
export function getAllCategoriesApi() {
  return request<ApiResponseData<ActivityCategoryItem[]>>({
    url: "/v2/admin/activity-categories/all",
    method: "get"
  })
}

/** 新增分类 */
export function addCategoryApi(data: CategoryFormParams) {
  return request<ApiResponseData<ActivityCategoryItem>>({
    url: "/v2/admin/activity-categories",
    method: "post",
    data
  })
}

/** 编辑分类 */
export function editCategoryApi(id: number, data: Partial<CategoryFormParams>) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activity-categories/${id}`,
    method: "put",
    data
  })
}

/** 删除分类 */
export function deleteCategoryApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activity-categories/${id}`,
    method: "delete"
  })
}
