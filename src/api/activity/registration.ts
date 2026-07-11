import { request } from "@/http/axios_n"

// 审核退款：用户已提交退款申请（payStatus=退款中），管理员审核通过后系统调用支付网关退款
export function refundRegistrationApi(registrationId: number, reason?: string) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activity-registrations/${registrationId}/refund`,
    method: "post",
    data: { reason }
  })
}

// 强制移除报名：管理员主动操作，不要求用户先提交退款申请；已支付的报名会立即触发退款
export function forceRemoveRegistrationApi(registrationId: number, reason?: string) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activity-registrations/${registrationId}/remove`,
    method: "post",
    data: { reason }
  })
}
