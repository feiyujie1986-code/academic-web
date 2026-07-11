<script lang="ts" setup>
import type { ReconciliationDiffItem } from "@/api/activity/reconciliation"
import { usePagination } from "@@/composables/usePagination_n"
import { formatMoney } from "@@/utils/money"
import {
  diffTypeLabelMap,
  diffTypeTagTypeMap,
  getReconciliationDiffsApi,
  orderStatusLabelMap,
  resolveReconciliationDiffApi
} from "@/api/activity/reconciliation"

// ========== 搜索表单 ==========
const searchFormData = reactive({
  billDate: "",
  resolved: undefined as boolean | undefined
})

const resolvedOptions = [
  { value: false, label: "未处理" },
  { value: true, label: "已处理" }
]

function handleSearch() {
  paginationData.currentPage = 1
  getTableData()
}

function resetSearch() {
  searchFormData.billDate = ""
  searchFormData.resolved = undefined
  handleSearch()
}

// ========== 表格数据 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()
const loading = ref(false)
const tableData = ref<ReconciliationDiffItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getReconciliationDiffsApi({
      billDate: searchFormData.billDate || undefined,
      resolved: searchFormData.resolved,
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    })
    if (res.code === 0) {
      tableData.value = res.data.list
      paginationData.total = res.data.total
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

getTableData()

function handleSizeChange(value: number) {
  changePageSize(value)
  getTableData()
}

function handleCurrentChange(value: number) {
  changeCurrentPage(value)
  getTableData()
}

// ========== 详情 ==========
const detailDialogVisible = ref(false)
const detailContent = ref("")

function handleViewDetail(row: ReconciliationDiffItem) {
  detailContent.value = row.detail || "（无详情）"
  detailDialogVisible.value = true
}

// ========== 标记已处理 ==========
const resolveLoading = ref<number | null>(null)

async function handleResolve(row: ReconciliationDiffItem) {
  try {
    await ElMessageBox.confirm(
      "请确认已线下核实清楚该笔差异再标记处理，确认标记为已处理？",
      "确认处理",
      { confirmButtonText: "确认", cancelButtonText: "取消", type: "warning" }
    )
    resolveLoading.value = row.id
    const res = await resolveReconciliationDiffApi(row.id)
    if (res.code === 0) {
      ElMessage.success("已标记为已处理")
      getTableData()
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    resolveLoading.value = null
  }
}
</script>

<template>
  <div>
    <el-form :inline="true" :model="searchFormData" class="search-form">
      <el-form-item label="对账日期">
        <el-date-picker
          v-model="searchFormData.billDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="全部日期"
          clearable
          style="width: 160px"
        />
      </el-form-item>
      <el-form-item label="处理状态">
        <el-select v-model="searchFormData.resolved" placeholder="全部" clearable style="width: 120px">
          <el-option v-for="item in resolvedOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleSearch">
          查询
        </el-button>
        <el-button icon="Refresh" @click="resetSearch">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="tableData" border>
      <el-table-column label="对账日期" width="110" align="center">
        <template #default="{ row }">
          {{ row.billDate }}
        </template>
      </el-table-column>
      <el-table-column label="订单号" min-width="180">
        <template #default="{ row }">
          {{ row.orderNo }}
        </template>
      </el-table-column>
      <el-table-column label="活动ID" width="80" align="center">
        <template #default="{ row }">
          {{ row.activityId }}
        </template>
      </el-table-column>
      <el-table-column label="差异类型" width="150" align="center">
        <template #default="{ row }">
          <el-tag :type="(diffTypeTagTypeMap[row.diffType] as any)">
            {{ diffTypeLabelMap[row.diffType] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="本地状态" width="90" align="center">
        <template #default="{ row }">
          {{ orderStatusLabelMap[row.localStatus] ?? row.localStatus }}
        </template>
      </el-table-column>
      <el-table-column label="渠道状态" width="110" align="center">
        <template #default="{ row }">
          {{ row.channelStatus || "-" }}
        </template>
      </el-table-column>
      <el-table-column label="本地金额" width="100" align="center">
        <template #default="{ row }">
          ¥{{ formatMoney(row.localAmount) }}
        </template>
      </el-table-column>
      <el-table-column label="渠道金额" width="100" align="center">
        <template #default="{ row }">
          ¥{{ formatMoney(row.channelAmount) }}
        </template>
      </el-table-column>
      <el-table-column label="处理状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.resolved ? 'success' : 'warning'">
            {{ row.resolved ? "已处理" : "未处理" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleViewDetail(row)">
            详情
          </el-button>
          <el-button
            v-if="!row.resolved"
            type="primary"
            link
            :loading="resolveLoading === row.id"
            @click="handleResolve(row)"
          >
            处理
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无对账差异" />

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

    <!-- 详情 -->
    <el-dialog v-model="detailDialogVisible" title="差异详情" width="480px">
      <p class="detail-content">
        {{ detailContent }}
      </p>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  margin-bottom: 12px;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-content {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
