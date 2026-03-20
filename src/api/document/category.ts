import { request } from "@/http/axios_n"

// ==================== Types ====================

export interface CategoryResponse {
  id: number
  name: string
  sort: number
  createdAt: number
  updatedAt: number
}

export interface CategoryListResponse {
  list: CategoryResponse[]
  total: number
  page: number
  pageSize: number
}

// ==================== Request Types ====================

export interface CreateCategoryReq {
  name: string
  sort?: number
}

export interface UpdateCategoryReq {
  name?: string
  sort?: number
}

export interface GetCategoriesReq {
  page?: number
  pageSize?: number
  keyword?: string
}

// ==================== API Functions ====================

/**
 * 创建分类
 */
export function createCategory(data: CreateCategoryReq) {
  return request<ApiResponseData<CategoryResponse>>({
    url: "/v2/admin/document-categories",
    method: "post",
    data
  })
}

/**
 * 获取分类列表 (分页)
 */
export function getCategories(params: GetCategoriesReq) {
  return request<ApiResponseData<CategoryListResponse>>({
    url: "/v2/admin/document-categories",
    method: "get",
    params
  })
}

/**
 * 获取所有分类 (不分页)
 */
export function getAllCategories() {
  return request<ApiResponseData<CategoryResponse[]>>({
    url: "/v2/admin/document-categories/all",
    method: "get"
  })
}

/**
 * 更新分类
 */
export function updateCategory(id: number, data: UpdateCategoryReq) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/document-categories/${id}`,
    method: "put",
    data
  })
}

/**
 * 删除分类
 */
export function deleteCategory(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/document-categories/${id}`,
    method: "delete"
  })
}
