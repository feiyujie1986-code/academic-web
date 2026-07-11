<script lang="ts" setup>
import type { SensitiveWordItem, SensitiveWordStatus } from "@/api/sensitiveWord/sensitiveWord"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import {
  getSensitiveWordListApi,
  reloadSensitiveWordsApi,
  sourceLabelMap,
  statusLabelMap,
  updateSensitiveWordStatusApi
} from "@/api/sensitiveWord/sensitiveWord"

defineOptions({ name: "SensitiveWordList" })

// ========== 搜索表单 ==========
const searchFormData = reactive({
  keyword: "",
  status: undefined as SensitiveWordStatus | undefined
})

const statusOptions = Object.entries(statusLabelMap).map(([value, label]) => ({
  value: Number(value),
  label
}))

function handleSearch() {
  paginationData.currentPage = 1
  getTableData()
}

function resetSearch() {
  searchFormData.keyword = ""
  searchFormData.status = undefined
  handleSearch()
}

// ========== 表格数据 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()
const loading = ref(false)
const tableData = ref<SensitiveWordItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getSensitiveWordListApi({
      keyword: searchFormData.keyword || undefined,
      status: searchFormData.status,
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

function getRowIndex(index: number) {
  return (paginationData.currentPage - 1) * paginationData.pageSize + index + 1
}

function getSourceLabel(row: SensitiveWordItem): string {
  return sourceLabelMap[row.source]
}

// ========== 启用/禁用 ==========
const statusLoading = ref<number | null>(null)

function handleStatusToggle(row: SensitiveWordItem, value: string | number | boolean) {
  handleStatusChange(row, value ? 1 : 2)
}

async function handleStatusChange(row: SensitiveWordItem, value: SensitiveWordStatus) {
  const previous = row.status
  row.status = value
  statusLoading.value = row.id
  try {
    const res = await updateSensitiveWordStatusApi(row.id, value)
    if (res.code === 0) {
      ElMessage.success(value === 1 ? "已启用" : "已禁用")
    } else {
      row.status = previous
    }
  } catch (error) {
    console.error(error)
    row.status = previous
  } finally {
    statusLoading.value = null
  }
}

// ========== 重新加载过滤器 ==========
const reloadLoading = ref(false)

async function handleReload() {
  try {
    await ElMessageBox.confirm(
      "手动重新加载会用数据库当前数据覆盖内存中的过滤器，仅在外部直接改库后需要，确认执行？",
      "确认重新加载",
      { confirmButtonText: "确认", cancelButtonText: "取消", type: "warning" }
    )
    reloadLoading.value = true
    const res = await reloadSensitiveWordsApi()
    if (res.code === 0) {
      ElMessage.success("重新加载成功")
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    reloadLoading.value = false
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索卡片 -->
    <el-card shadow="never" class="search-wrapper">
      <el-form :inline="true" :model="searchFormData">
        <el-form-item label="敏感词">
          <el-input
            v-model="searchFormData.keyword"
            placeholder="请输入敏感词关键词"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchFormData.status"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
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
    </el-card>

    <!-- 列表卡片 -->
    <el-card v-loading="loading" shadow="never">
      <div class="toolbar-wrapper">
        <el-tooltip content="用于外部直接改库后，手动让内存过滤器生效" effect="light">
          <el-button type="primary" :loading="reloadLoading" @click="handleReload">
            重新加载过滤器
          </el-button>
        </el-tooltip>
        <el-tooltip content="刷新列表" effect="light">
          <el-button type="primary" icon="RefreshRight" circle plain @click="getTableData" />
        </el-tooltip>
      </div>

      <el-table :data="tableData" border style="width: 100%">
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">
            {{ getRowIndex($index) }}
          </template>
        </el-table-column>
        <el-table-column label="敏感词" min-width="160">
          <template #default="{ row }">
            {{ row.word }}
          </template>
        </el-table-column>
        <el-table-column label="来源" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.source === 'default' ? 'info' : 'primary'">
              {{ getSourceLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="statusLoading === row.id"
              active-text="启用"
              inactive-text="禁用"
              inline-prompt
              @change="(value) => handleStatusToggle(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt * 1000) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt * 1000) }}
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && tableData.length === 0" description="暂无敏感词" />

      <!-- 分页 -->
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
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.search-wrapper {
  margin-bottom: 5px;

  :deep(.el-card__body) {
    padding-bottom: 2px;
  }
}

.toolbar-wrapper {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
