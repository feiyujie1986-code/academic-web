import { request } from "@/http/axios_n"

// ==================== Types ====================

export interface AuthorizationResponse {
  id: number
  authType: 1 | 2 // 1-用户 2-班级
  authName: string
  targetId: number
  targetName: string
  createdBy: number
  createdAt: number
}

// 人员授权项
export interface UserAuthorizationItem {
  userId: number
  nickname: string
  email: string
  userType: 1 | 2 | 4 | 8 | 16 // 1-内部人员 2-学员 4-教师 8-大使 16-机构同工
  userTypeName: string
  authorized: boolean
  organizationId?: number // 所属合作机构ID（机构同工类型有值）
  organizationName?: string // 所属合作机构名称（机构同工类型有值）
}

export interface UserAuthorizationListData {
  list: UserAuthorizationItem[]
  total: number
  page: number
  pageSize: number
}

// 班级授权项
export interface ClassAuthorizationItem {
  classId: number
  className: string
  authorized: boolean
}

export interface ClassAuthorizationListData {
  list: ClassAuthorizationItem[]
  total: number
  page: number
  pageSize: number
}

// 授权目标项（带授权状态）
export interface AuthorizationTargetItem {
  id: number
  nickname?: string // 用户名称
  name?: string // 班级名称
  email?: string
  authorized: boolean // 是否已授权
  authId?: number // 授权记录ID（已授权时有值）
}

export interface AuthorizationTargetListData {
  list: AuthorizationTargetItem[]
  total: number
  page: number
  pageSize: number
}

// ==================== Request Types ====================

export interface AddAuthorizationReq {
  authType: 1 | 2 // 1-用户 2-班级
  targetIds: number[]
}

export interface GetAuthorizationTargetsReq {
  page: number
  pageSize: number
  targetType: "teacher" | "class" | "seniorTeacher" | "student"
  authorized?: boolean // 筛选授权状态
  keyword?: string // 搜索关键词
  teacherId?: number // 通过教师ID筛选
}

export interface GetUserAuthorizationsReq {
  page?: number
  pageSize?: number
  status?: "authorized" | "unauthorized" | "" // 授权状态筛选
  keyword?: string // 姓名或邮箱关键字
  userType?: 1 | 2 | 4 | 8 | 16 // 用户类型：1-内部人员 2-学员 4-教师 8-大使 16-机构同工
}

export interface GetClassAuthorizationsReq {
  page?: number
  pageSize?: number
  status?: "authorized" | "unauthorized" | "" // 授权状态筛选
  keyword?: string // 班级名称关键字
}

// ==================== API Functions ====================

/**
 * 添加授权
 */
export function addAuthorization(documentId: number, data: AddAuthorizationReq) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/documents/${documentId}/authorizations`,
    method: "post",
    data
  })
}

export interface BatchCancelAuthorizationReq {
  authType: 1 | 2 // 1-用户 2-班级
  targetIds: number[]
}

/**
 * 批量取消授权（按目标类型）
 * 不需要知道具体的授权记录ID，直接通过 targetId 取消
 */
export function batchCancelAuthorization(documentId: number, data: BatchCancelAuthorizationReq) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/documents/${documentId}/authorizations/batch`,
    method: "delete",
    data
  })
}

/**
 * 获取授权列表
 */
export function getAuthorizations(documentId: number) {
  return request<ApiResponseData<AuthorizationResponse[]>>({
    url: `/v2/admin/documents/${documentId}/authorizations`,
    method: "get"
  })
}

/**
 * 获取授权目标列表（带授权状态）
 */
export function getAuthorizationTargets(documentId: number, params: GetAuthorizationTargetsReq) {
  return request<ApiResponseData<AuthorizationTargetListData>>({
    url: `/v2/admin/documents/${documentId}/authorization-targets`,
    method: "get",
    params
  })
}

/**
 * 获取人员授权列表
 */
export function getUserAuthorizations(documentId: number, params: GetUserAuthorizationsReq) {
  return request<ApiResponseData<UserAuthorizationListData>>({
    url: `/v2/admin/documents/${documentId}/user-authorizations`,
    method: "get",
    params
  })
}

/**
 * 获取班级授权列表
 */
export function getClassAuthorizations(documentId: number, params: GetClassAuthorizationsReq) {
  return request<ApiResponseData<ClassAuthorizationListData>>({
    url: `/v2/admin/documents/${documentId}/class-authorizations`,
    method: "get",
    params
  })
}
