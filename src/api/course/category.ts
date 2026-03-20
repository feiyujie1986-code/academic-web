import { request } from "@/http/axios_n"

interface categoryData {
  name: string
}

export interface categoryDataModel extends categoryData {
  categoryId: number
}

// 数据结构 - List
export type categoryListData = categoryDataModel[]

/** 获取所有分类 */
export function getCategoriesApi() {
  return request<ApiResponseData<categoryListData>>({
    url: "/v2/admin/course/categories",
    method: "get"
  })
}

// 添加分类
export function addCategoryApi(data: categoryData) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/course/categories",
    method: "post",
    data
  })
}

// 编辑分类
export function editCategoryApi(data: categoryData & CId) {
  return request<ApiResponseData<categoryDataModel>>({
    url: `/v2/admin/course/categories/${data.id}`,
    method: "put",
    data
  })
}

// 删除分类
export function deleteCategoryApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/course/categories/${id}`,
    method: "delete"
  })
}
