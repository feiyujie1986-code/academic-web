import type { DocumentResponse } from "@/api/document/document"
import { request } from "@/http/axios_n"

interface userBindData {
  teacherIds: number[]
  seniorTeacherIds: number[]
  studentIds: number[]
  classMonitorIds: number[]
}
interface classData {
  name: string
  remark: string
  startTime: number
  endTime: number
  organizationId?: number
}

export interface classDataModel extends classData, BaseModel {
  classId: number
  createdAt: number
  createdDate: string
  startDate: string
  endDate: string
}

export interface classListItem extends classData {
  classId: number
  seniorTeacherCount: number
  studentCount: number
  teacherCount: number
  lessonTotalCount: number
  lessonCompletedCount: number
  createdAt: number
  createdDate: string
  teacherIds: number[]
  seniorTeacherIds: number[]
  studentIds: number[]
  classMonitorIds: number[]
  organizationName?: string
}

// 数据结构 - List
export type classListData = ListData<classListItem[]>

interface reqClassList extends PageInfo {
  name?: string
  userIds?: number[]
  status?: number
  teacherIds?: number[]
  seniorTeacherIds?: number[]
  studentIds?: number[]
}

/** 获取详情 */
export function getClassInfoApi(id: number) {
  return request<ApiResponseData<classListItem>>({
    url: `/v2/admin/classes/${id}`,
    method: "get"
  })
}

/** 获取列表 */
export function getClasssApi(data: reqClassList) {
  return request<ApiResponseData<classListData>>({
    url: "/v2/admin/classes",
    method: "get",
    params: data
  })
}

// 添加
export function addClassApi(data: classData & userBindData) {
  return request<ApiResponseData<classListItem>>({
    url: "/v2/admin/classes",
    method: "post",
    data
  })
}

// 编辑
export function editClassApi(data: classData & { classId: number } & userBindData) {
  return request<ApiResponseData<classDataModel>>({
    url: `/v2/admin/classes/${data.classId}`,
    method: "put",
    data
  })
}

// 删除
export function deleteClassApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/classes/${id}`,
    method: "delete"
  })
}

// 编辑基础信息请求参数
interface editClassBaseInfoData {
  name: string
  organizationId?: number
  startTime: number
  endTime: number
  remark?: string
}

// 编辑基础信息响应数据
interface editClassBaseInfoResponse {
  classId: number
  gid: string
  name: string
  remark: string
  organizationId: number
  organizationName: string
  createdAt: number
  startTime: number
  endTime: number
}

// 编辑基础信息
export function editClassBaseInfoApi(classId: number, data: editClassBaseInfoData) {
  return request<ApiResponseData<editClassBaseInfoResponse>>({
    url: `/v2/admin/classes/${classId}/baseinfo`,
    method: "patch",
    data
  })
}

// ==================== 班级授权资料 ====================

// 班级授权资料项
export interface ClassAuthorizedDocument {
  authorizationId: number
  document: DocumentResponse
  createdBy: number
  createdByName: string
  createdAt: number
}

// 班级授权资料列表响应
export interface ClassAuthorizedDocumentListData {
  list: ClassAuthorizedDocument[]
  total: number
  page: number
  pageSize: number
}

// 获取班级授权资料请求参数
export interface GetClassAuthorizedDocumentsReq {
  page?: number
  pageSize?: number
}

/**
 * 获取班级的授权资料列表
 */
export function getClassAuthorizedDocumentsApi(classId: number, params?: GetClassAuthorizedDocumentsReq) {
  return request<ApiResponseData<ClassAuthorizedDocumentListData>>({
    url: `/v2/admin/classes/${classId}/authorized-documents`,
    method: "get",
    params
  })
}
