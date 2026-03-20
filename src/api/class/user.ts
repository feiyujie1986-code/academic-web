import { request } from "@/http/axios_n"

/**
 * 班级用户数据模型
 */
export interface ClassUserModel {
  classId: number
  userId: number
  userType: string
  joinTime: number
  joinDate: string // 加入班级日期
  nickname: string
  email: string
  remark: string // 备注
}

/**
 * 添加班级用户请求参数
 */
export interface BindClassUserRequest {
  classId: number
  userIds: number[]
  userType: "teacher" | "student" | "senior_teacher" | "class_monitor"
  operationType: "add" | "remove"
}

/**
 * 获取班级用户列表
 * @param classId 班级ID
 * @param userTypes 用户类型列表
 * @returns Promise<ApiResponseData<ClassUserModel[]>>
 */
export function getClassUsersApi(classId: number, userTypes?: string[]) {
  return request<ApiResponseData<ClassUserModel[]>>({
    url: `/v2/admin/classes/${classId}/users`,
    method: "get",
    params: userTypes ? { userTypes: userTypes.join(",") } : undefined
  })
}

/**
 * 绑定班级用户
 * @param data 绑定用户请求参数
 * @returns Promise<ApiResponseData<null>>
 */
export function bindClassUsersApi(data: BindClassUserRequest) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/classes/${data.classId}/users`,
    method: "post",
    data
  })
}
