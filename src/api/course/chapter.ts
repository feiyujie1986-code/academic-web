import { request } from "@/http/axios_n"

interface chapterData {
  name: string
  courseId: number
  classId?: number | null
}

export interface ChapterDataModel extends chapterData {
  chapterId: number
  sort: number
  isShow: number
}

// 数据结构 - List
type chapterListData = ChapterDataModel[]

interface reqChapterEdit {
  id: number
  name: string
}
export function getChapterListApi(courseId: number) {
  return request<ApiResponseData<chapterListData>>({
    url: "/v2/admin/course/chapters",
    method: "get",
    params: { courseId }
  })
}
// 添加chapter
export function addChapterApi(data: chapterData) {
  return request<ApiResponseData<ChapterDataModel>>({
    url: "/v2/admin/course/chapters",
    method: "post",
    data
  })
}
// 修改chapter
export function editChapterApi(data: reqChapterEdit) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/course/chapters/${data.id}`,
    method: "put",
    data
  })
}
// 删除chapter
export function deleteChapterApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/course/chapters/${id}`,
    method: "delete"
  })
}
