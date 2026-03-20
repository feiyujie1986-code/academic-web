import { request } from "@/http/axios_n"

interface courseData {
  name: string
  description: string
  categoryId: number
  classId: number
  status: number
}

interface CourseId {
  courseId: number
}

export interface courseDataModel extends courseData, BaseModel {
  lessonCount: number
  createdDate: string
}

export interface courseListItem {
  courseId: number
  name: string
  description: string
  categoryName: string
  categoryId: number
  createdByName: string
  createdDate: string
  createdAt: number
  classId: number
  status: number
  lessonCount: number
}

// 数据结构 - List
export type courseListData = ListData<courseListItem[]>

interface reqCourseList extends PageInfo {
  name?: string
  categoryId?: number
  status?: number
}

/** 获取课程详情 */
export function getCourseInfoApi(id: number) {
  return request<ApiResponseData<courseDataModel>>({
    url: `/v2/admin/courses/${id}`,
    method: "get"
  })
}

/** 获取课程列表 */
export function getCoursesApi(data: reqCourseList) {
  return request<ApiResponseData<courseListData>>({
    url: "/v2/admin/courses",
    method: "get",
    params: data
  })
}

// 添加课程
export function addCourseApi(data: courseData) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/courses",
    method: "post",
    data
  })
}

// 编辑课程
export function editCourseApi(data: courseData & CourseId) {
  return request<ApiResponseData<courseDataModel>>({
    url: `/v2/admin/courses/${data.courseId}`,
    method: "put",
    data
  })
}

// 删除课程
export function deleteCourseApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/courses/${id}`,
    method: "delete"
  })
}

// 更新课程状态
export function updateCourseStatusApi(data: { status: number } & CId) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/courses/${data.id}/status`,
    method: "post",
    data
  })
}
