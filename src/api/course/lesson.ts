// src/api/course/chapter.ts
import { request } from "@/http/axios_n"

export interface fileMeta {
  filename: string
  size: number
  fullpath: string
  md5: string
  transcodeStatus?: "pending" | "processing" | "completed" | "failed"
}
// 定义基础数据结构
export interface LessonItem {
  lessonId: number
  courseId: number
  classId: number
  chapterId: number
  content: string
  lessonType: number
  videoFile?: fileMeta
  discussMode: number
  liveLink: string
  liveProvider: string
  name: string
  remark: string
  sort: number
  startTime: string
  endTime: string
  timeZone: string
  duration: number
  startDate: string
  endDate: string
  teacherId: number
  teacherName: string
  seniorTeacherId: number
  seniorTeacherName: string
  assistantTeacherId: number
  assistantTeacherName: string
  attachments: fileMeta[]
  status: number
}

export interface ChapterModel {
  courseId: number
  classId?: number | null
  chapterId: number
  name: string
  sort: number
  isShow: number
}

export interface ChapterItem extends ChapterModel {
  lessons: LessonItem[]
}
// 定义lessonListData模型 为 ChapterItem[]
export type lessonListData = ChapterItem[]

export interface reqLessonList {
  courseId: number
  chapterId?: number
}

export interface reqLessonAdd {
  courseId: number
  name: string
  chapterId: number
  lessonType: number
  content: string
  videoFile: fileMeta
  discussMode: number
  liveLink: string
  liveProvider: string
  remark: string
  attachments: fileMeta[]
  startTime?: string
  endTime?: string
  timeZone?: string
  duration?: number
  teacherId?: number
  seniorTeacherId?: number
}

interface reqLessonEdit extends reqLessonAdd {
  id: number
}

// 获取课程章节列表
export function getCourseLessons(data: reqLessonList) {
  return request<ApiResponseData<lessonListData>>({
    url: "/v2/admin/course/lessons",
    method: "get",
    params: data
  })
}

// 添加课节
export function addLessonApi(data: reqLessonAdd) {
  return request<ApiResponseData<LessonItem>>({
    url: "/v2/admin/course/lessons",
    method: "post",
    data
  })
}
// 修改课节
export function editLessonApi(data: reqLessonEdit) {
  return request<ApiResponseData<LessonItem>>({
    url: `/v2/admin/course/lessons/${data.id}`,
    method: "put",
    data
  })
}
// 删除课节
export function deleteLessonApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/course/lessons/${id}`,
    method: "delete"
  })
}
