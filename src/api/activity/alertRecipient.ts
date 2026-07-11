import { request } from "@/http/axios_n"

// ==================== 类型定义 ====================

export interface AlertRecipientItem {
  id: number
  email: string
  remark?: string
  enabled: boolean
}

export interface AlertRecipientListData {
  list: AlertRecipientItem[]
}

export interface AlertRecipientFormParams {
  email: string
  remark?: string
}

// ==================== API 函数 ====================

/** 查看告警收件人列表 */
export function getAlertRecipientsApi() {
  return request<ApiResponseData<AlertRecipientListData>>({
    url: "/v2/admin/activity-alert-recipients",
    method: "get"
  })
}

/** 新增告警收件人 */
export function createAlertRecipientApi(data: AlertRecipientFormParams) {
  return request<ApiResponseData<AlertRecipientItem>>({
    url: "/v2/admin/activity-alert-recipients",
    method: "post",
    data
  })
}

/** 编辑告警收件人（含启用/禁用） */
export function editAlertRecipientApi(id: number, data: { remark?: string, enabled?: boolean }) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activity-alert-recipients/${id}`,
    method: "put",
    data
  })
}

/** 删除告警收件人 */
export function deleteAlertRecipientApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activity-alert-recipients/${id}`,
    method: "delete"
  })
}
