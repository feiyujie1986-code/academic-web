import { request } from "@/http/axios_n"

/**
 * 班级课程数据模型
 */
export interface ClassCourseModel {
  classId: number
  courseId: number
  name: string
  description: string
  // categoryName: string
  // categoryId: number
}

/**
 * 获取班级课程列表
 * @param classId 班级ID
 * @returns Promise<ApiResponseData<ClassCourseModel[]>>
 */
export function getClassCoursesApi(classId: number) {
  return request<ApiResponseData<ClassCourseModel[]>>({
    url: `/v2/admin/classes/${classId}/courses`,
    method: "get"
  })
}

// 导入课程模板
export function importCourseTemplateApi(data: { classId: number, courseId: number }) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/classes/${data.classId}/courses/import`,
    method: "post",
    data: { courseId: data.courseId }
  })
}
