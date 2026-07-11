import { request } from "@/http/axios_n"

// ==================== 常量定义 ====================

// 差异类型
export enum ReconciliationDiffType {
  ChannelPaidLocalNot = 1, // 渠道已支付本地未支付
  LocalPaidChannelNot = 2, // 本地已支付渠道未支付
  AmountMismatch = 3, // 金额不一致
  QueryFailed = 4 // 渠道查单失败
}

export const diffTypeLabelMap: Record<number, string> = {
  [ReconciliationDiffType.ChannelPaidLocalNot]: "渠道已支付/本地未支付",
  [ReconciliationDiffType.LocalPaidChannelNot]: "本地已支付/渠道未支付",
  [ReconciliationDiffType.AmountMismatch]: "金额不一致",
  [ReconciliationDiffType.QueryFailed]: "渠道查单失败"
}

export const diffTypeTagTypeMap: Record<number, string> = {
  [ReconciliationDiffType.ChannelPaidLocalNot]: "danger",
  [ReconciliationDiffType.LocalPaidChannelNot]: "danger",
  [ReconciliationDiffType.AmountMismatch]: "warning",
  [ReconciliationDiffType.QueryFailed]: "info"
}

// 本地订单状态（对账差异里的 localStatus 字段用）
export const orderStatusLabelMap: Record<number, string> = {
  0: "待支付",
  1: "已支付",
  2: "已关闭",
  3: "退款中",
  4: "已退款"
}

// ==================== 类型定义 ====================

export interface ReconciliationDiffItem {
  id: number
  billDate: string
  orderNo: string
  activityId: number
  diffType: ReconciliationDiffType
  localStatus: number
  channelStatus: string
  localAmount: number
  channelAmount: number
  detail: string
  resolved: boolean
  createdAt: number
}

export type ReconciliationDiffListData = ListData<ReconciliationDiffItem[]>

export interface ReconciliationDiffQueryParams extends PageInfo {
  billDate?: string
  resolved?: boolean
}

// ==================== API 函数 ====================

/** 查看对账差异列表 */
export function getReconciliationDiffsApi(params: ReconciliationDiffQueryParams) {
  return request<ApiResponseData<ReconciliationDiffListData>>({
    url: "/v2/admin/activity-reconciliation/diffs",
    method: "get",
    params
  })
}

/** 标记对账差异已处理 */
export function resolveReconciliationDiffApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/activity-reconciliation/diffs/${id}/resolve`,
    method: "put"
  })
}
