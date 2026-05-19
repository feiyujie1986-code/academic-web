import { request } from "@/http/axios_n"

// 可见性
export const VisibilityMap: Record<number, string> = {
  1: "公开",
  2: "仅自己",
  3: "指定可见",
  4: "指定群",
  5: "指定不可见",
  6: "指定成员",
}

// 笔记状态
export const NoteStatusMap: Record<number, string> = {
  1: "正常",
  2: "已屏蔽",
}

// 媒体类型
export const MediaTypeMap: Record<number, string> = {
  1: "图片",
  2: "视频",
}

export interface VisibilityDetailClass {
  id: number
  name: string
}

export interface VisibilityDetailMember {
  id: number
  nickname: string
  account: string
  avatar: string
}

export interface VisibilityDetail {
  classes?: VisibilityDetailClass[]
  members?: VisibilityDetailMember[]
}

export interface NoteMedia {
  id: number
  type: 1 | 2
  url: string
  videoUid?: string
  sort: number
  width?: number
  height?: number
  duration?: number
}

export interface NoteListItem extends BaseModel {
  userId: number
  userNickname?: string
  userAvatar?: string
  title: string
  content?: string
  visibility: number
  visibilityDetail?: VisibilityDetail | null
  status: number
  coverUrl?: string
  likeCount: number
  dislikeCount: number
  commentCount: number
  favoriteCount: number
  mediaList: NoteMedia[]
}

export interface NoteComment {
  id: number
  noteId: number
  userId: number
  parentId: number
  content: string
  status: number
  createdAt: number
  replies?: NoteComment[]
}

interface ReqNoteList extends PageInfo {
  title?: string
  userId?: number
  status?: number
}

export type NoteListData = ListData<NoteListItem[]>
export type NoteCommentListData = ListData<NoteComment[]>

export function getNoteListApi(params: ReqNoteList) {
  return request<ApiResponseData<NoteListData>>({
    url: "/v2/admin/notes",
    method: "get",
    params
  })
}

export function getNoteDetailApi(id: number) {
  return request<ApiResponseData<NoteListItem>>({
    url: `/v2/admin/notes/${id}`,
    method: "get"
  })
}

export function updateNoteStatusApi(id: number, status: 1 | 2) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/notes/${id}/status`,
    method: "patch",
    data: { status }
  })
}

export function deleteNoteApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/notes/${id}`,
    method: "delete"
  })
}

export function getNoteCommentsApi(noteId: number, params: PageInfo) {
  return request<ApiResponseData<NoteCommentListData>>({
    url: `/v2/admin/notes/${noteId}/comments`,
    method: "get",
    params
  })
}

export function deleteNoteCommentApi(noteId: number, commentId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/notes/${noteId}/comments/${commentId}`,
    method: "delete"
  })
}