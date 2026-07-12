<script lang="ts" setup>
import type { RegistrationItem } from "@/api/activity/activity"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { formatMoney } from "@@/utils/money"
import {
  ActivityFeeType,
  exportRegistrationsApi,
  getActivityRegistrationsApi,
  participationTypeLabelMap,
  PayStatus,
  payStatusLabelMap,
  payStatusTagTypeMap
} from "@/api/activity/activity"
import { confirmOfflinePaymentApi, forceRemoveRegistrationApi, refundRegistrationApi } from "@/api/activity/registration"

interface Props {
  visible: boolean
  activityId: number | null
  activityTitle: string
  maxParticipants: number
  registeredCount: number
  feeType: ActivityFeeType
}

interface Emits {
  (e: "update:visible", value: boolean): void
  (e: "changed"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
})

const isPaid = computed(() => props.feeType === ActivityFeeType.Paid)

const capacityText = computed(() => {
  const max = props.maxParticipants === 0 ? "不限" : String(props.maxParticipants)
  return `已报名 ${props.registeredCount}/${max} 人`
})

// ========== 表格数据 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()
const loading = ref(false)
const tableData = ref<RegistrationItem[]>([])
const totalReceivable = ref(0)
const totalReceived = ref(0)

async function getTableData() {
  if (!props.activityId) return
  loading.value = true
  try {
    const res = await getActivityRegistrationsApi(props.activityId, {
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    })
    if (res.code === 0) {
      tableData.value = res.data.list
      paginationData.total = res.data.total
      totalReceivable.value = res.data.totalReceivable
      totalReceived.value = res.data.totalReceived
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (visible) => {
  if (visible) {
    paginationData.currentPage = 1
    getTableData()
  }
})

function handleSizeChange(value: number) {
  changePageSize(value)
  getTableData()
}

function handleCurrentChange(value: number) {
  changeCurrentPage(value)
  getTableData()
}

// ========== 操作类型判断 ==========
// 审核退款：仅用于处理用户已提交的退款申请（退款中）
// 确认收款：仅用于待线下付款的报名，与"移除"同时展示
// 移除：管理员主动移除任意有效报名，与"审核退款"互斥展示
function canRefund(row: RegistrationItem): boolean {
  return row.payStatus === PayStatus.Refunding
}

function canConfirmOffline(row: RegistrationItem): boolean {
  return row.payStatus === PayStatus.OfflinePending
}

function canRemove(row: RegistrationItem): boolean {
  return row.payStatus !== PayStatus.Refunding
    && row.payStatus !== PayStatus.Refunded
    && row.payStatus !== PayStatus.Expired
}

// ========== 强制移除 ==========
const removeLoading = ref<number | null>(null)

async function handleForceRemove(row: RegistrationItem) {
  if (!props.activityId) return
  const tip = row.payStatus === PayStatus.Paid
    ? `「${row.nickname}」已支付，移除将立即为其退款，确认移除？`
    : `确认将「${row.nickname}」从报名名单中移除？`
  try {
    const { value: reason } = await ElMessageBox.prompt(tip, "确认移除", {
      confirmButtonText: "确认移除",
      cancelButtonText: "取消",
      inputPlaceholder: "移除原因（选填，会通过站内通知告知用户）",
      type: "warning"
    })
    removeLoading.value = row.registrationId
    const res = await forceRemoveRegistrationApi(row.registrationId, reason || undefined)
    if (res.code === 0) {
      ElMessage.success("已移除")
      getTableData()
      emit("changed")
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    removeLoading.value = null
  }
}

// ========== 审核退款 ==========
const refundDialogVisible = ref(false)
const refundTargetRow = ref<RegistrationItem | null>(null)
const refundReason = ref("")
const refundLoading = ref(false)

function handleOpenRefund(row: RegistrationItem) {
  refundTargetRow.value = row
  refundReason.value = ""
  refundDialogVisible.value = true
}

async function confirmRefund() {
  if (!refundTargetRow.value) return
  refundLoading.value = true
  try {
    const res = await refundRegistrationApi(refundTargetRow.value.registrationId, refundReason.value || undefined)
    if (res.code === 0) {
      ElMessage.success("退款已提交，微信渠道到账可能有延迟，请稍后刷新查看")
      refundDialogVisible.value = false
      getTableData()
      emit("changed")
    }
  } catch (error) {
    console.error(error)
  } finally {
    refundLoading.value = false
  }
}

// ========== 确认线下付款收款 ==========
const confirmOfflineDialogVisible = ref(false)
const confirmOfflineTargetRow = ref<RegistrationItem | null>(null)
const confirmOfflineLoading = ref(false)

function handleOpenConfirmOffline(row: RegistrationItem) {
  confirmOfflineTargetRow.value = row
  confirmOfflineDialogVisible.value = true
}

async function confirmOfflinePayment() {
  if (!confirmOfflineTargetRow.value) return
  confirmOfflineLoading.value = true
  try {
    const res = await confirmOfflinePaymentApi(confirmOfflineTargetRow.value.registrationId)
    if (res.code === 0) {
      ElMessage.success("已确认收款")
      confirmOfflineDialogVisible.value = false
      getTableData()
      emit("changed")
    }
  } catch (error) {
    console.error(error)
  } finally {
    confirmOfflineLoading.value = false
  }
}

// ========== 导出名单 ==========
const exportLoading = ref(false)

async function handleExport() {
  if (!props.activityId) return
  exportLoading.value = true
  try {
    const blobData = await exportRegistrationsApi(props.activityId)
    const url = window.URL.createObjectURL(new Blob([blobData as Blob], { type: "text/csv" }))
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = `活动${props.activityId}-报名名单-${formatDateTime(Date.now(), "YYYYMMDDHHmmss")}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error(error)
    ElMessage.error("导出失败")
  } finally {
    exportLoading.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`《${activityTitle}》报名人员`"
    :width="isPaid ? '760px' : '700px'"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="dialog-header-info">
      <span>
        {{ capacityText }}
        <template v-if="isPaid">
          &nbsp;应收 ¥{{ formatMoney(totalReceivable) }} / 已收 ¥{{ formatMoney(totalReceived) }}
        </template>
      </span>
      <el-button type="primary" link :loading="exportLoading" @click="handleExport">
        导出名单
      </el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe row-key="registrationId">
      <el-table-column v-if="isPaid" type="expand">
        <template #default="{ row }">
          <div class="participants-detail">
            <div v-for="(p, index) in (row as RegistrationItem).participants" :key="index" class="participant-item">
              {{ p.name }}（{{ p.categoryName }}）¥{{ formatMoney(p.price) }}
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="用户" min-width="160">
        <template #default="{ row }">
          <div class="user-cell">
            <el-avatar :src="row.avatar" :size="32" />
            <span class="user-name">{{ row.nickname || `用户 ${row.userId}` }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="isPaid" label="方式" width="80" align="center">
        <template #default="{ row }">
          {{ participationTypeLabelMap[row.participationType] }}
        </template>
      </el-table-column>
      <el-table-column v-if="isPaid" label="金额" width="90" align="center">
        <template #default="{ row }">
          ¥{{ formatMoney(row.totalFee) }}
        </template>
      </el-table-column>
      <el-table-column v-if="isPaid" label="支付状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="(payStatusTagTypeMap[row.payStatus] as any)">
            {{ payStatusLabelMap[row.payStatus] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="报名时间" width="170" align="center">
        <template #default="{ row }">
          {{ formatDateTime(row.registeredAt * 1000) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button
            v-if="canConfirmOffline(row)"
            type="success"
            link
            @click="handleOpenConfirmOffline(row)"
          >
            确认收款
          </el-button>
          <el-button
            v-if="canRemove(row)"
            type="danger"
            link
            :loading="removeLoading === row.registrationId"
            @click="handleForceRemove(row)"
          >
            移除
          </el-button>
          <el-button
            v-if="canRefund(row)"
            type="warning"
            link
            @click="handleOpenRefund(row)"
          >
            审核退款
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无报名记录" />

    <div class="pager-wrapper">
      <el-pagination
        background
        :layout="paginationData.layout"
        :page-sizes="paginationData.pageSizes"
        :total="paginationData.total"
        :page-size="paginationData.pageSize"
        :current-page="paginationData.currentPage"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </el-dialog>

  <!-- 审核退款 -->
  <el-dialog
    v-model="refundDialogVisible"
    :title="`审核退款 - ${refundTargetRow?.nickname ?? ''}`"
    width="420px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="refund-info">
      <div>报名方式：{{ refundTargetRow ? participationTypeLabelMap[refundTargetRow.participationType] : "" }}</div>
      <div>应付金额：¥{{ refundTargetRow ? formatMoney(refundTargetRow.totalFee) : "0.00" }}</div>
    </div>
    <el-input
      v-model="refundReason"
      type="textarea"
      :rows="3"
      placeholder="退款原因（选填）"
      maxlength="200"
      show-word-limit
    />
    <div class="refund-warning">
      确认后系统将立即调用支付网关发起退款
    </div>
    <template #footer>
      <el-button @click="refundDialogVisible = false">
        取消
      </el-button>
      <el-button type="primary" :loading="refundLoading" @click="confirmRefund">
        确认退款
      </el-button>
    </template>
  </el-dialog>

  <!-- 确认线下付款收款 -->
  <el-dialog
    v-model="confirmOfflineDialogVisible"
    :title="`确认收款 - ${confirmOfflineTargetRow?.nickname ?? ''}`"
    width="420px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="refund-info">
      <div>报名方式：{{ confirmOfflineTargetRow ? participationTypeLabelMap[confirmOfflineTargetRow.participationType] : "" }}</div>
      <div>应付金额：¥{{ confirmOfflineTargetRow ? formatMoney(confirmOfflineTargetRow.totalFee) : "0.00" }}</div>
    </div>
    <div class="refund-warning">
      请确认已线下收到该用户的付款，确认后无法撤销，如需撤销请改用「移除」并让用户重新报名
    </div>
    <template #footer>
      <el-button @click="confirmOfflineDialogVisible = false">
        取消
      </el-button>
      <el-button type="primary" :loading="confirmOfflineLoading" @click="confirmOfflinePayment">
        确认收款
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.dialog-header-info {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-size: 14px;
}

.participants-detail {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.refund-info {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.refund-warning {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-color-warning);
}
</style>
