import { request } from "@/http/axios_n"

export function banUserApi(userId: number, reason?: string) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/users/${userId}/ban`,
    method: "post",
    data: reason ? { reason } : {}
  })
}

export function unbanUserApi(userId: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/im/users/${userId}/unban`,
    method: "post"
  })
}
