<script lang="ts" setup>
import type { NoticeListItem } from "@/api/notice/notice"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { ElMessage, ElMessageBox } from "element-plus"
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  cancelNoticeApi,
  categoryLabelMap,
  displayStatusLabelMap,
  displayStatusStyleMap,
  getDisplayStatus,
  getNoticesApi,
  NoticeDisplayStatus,
  NoticeType
} from "@/api/notice/notice"

defineOptions({
  name: "NoticeList"
})

// 通知类型标签映射
const typeLabelMap: Record<string, string> = {
  [NoticeType.System]: "系统通知",
  [NoticeType.Business]: "业务通知",
  [NoticeType.Alert]: "预警通知"
}

const router = useRouter()
const route = useRoute()

// ==================== 分页管理 ====================
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

// ==================== Tab 切换 ====================
// 从 query 参数读取 tab，默认为已发布
const activeTab = ref((route.query.tab as string) || "published")

// 已发布 tab 下的子 tab（手动通知/自动通知）
const publishedSubTab = ref("manual")

function handleTabChange() {
  paginationData.currentPage = 1
  // 切换到已发布tab时，重置子tab为手动通知
  if (activeTab.value === "published") {
    publishedSubTab.value = "manual"
  }
  getTableData()
}

function handlePublishedSubTabChange() {
  paginationData.currentPage = 1
  getTableData()
}

// ==================== 搜索表单 ====================
const searchFormData = reactive({
  keyword: "",
  status: "" as string
})

// 待发布 tab 状态选项
const pendingStatusOptions = [
  { label: "已定时待发布", value: "active" },
  { label: "已撤回", value: "cancelled" }
]

function handleSearch() {
  paginationData.currentPage = 1
  getTableData()
}

function handleReset() {
  searchFormData.keyword = ""
  searchFormData.status = ""
  paginationData.currentPage = 1
  getTableData()
}

// ==================== 表格数据 ====================
const loading = ref(false)
const tableData = ref<NoticeListItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    // 构建请求参数
    const params: Record<string, any> = {
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    }

    // 关键词搜索
    if (searchFormData.keyword) {
      params.keyword = searchFormData.keyword
    }

    // Tab 筛选
    if (activeTab.value === "published") {
      params.publishStatus = "published"
      // 已发布 tab 下根据子 tab 添加 triggerType 参数
      params.triggerType = publishedSubTab.value
    } else if (activeTab.value === "pending") {
      params.publishStatus = "unpublished"
      // 未发布 Tab 下的子状态筛选（已定时待发布/已撤回）
      if (searchFormData.status) {
        params.status = searchFormData.status
      }
    }

    const res = await getNoticesApi(params)
    if (res.code === 0) {
      tableData.value = res.data.list || []
      paginationData.total = res.data.total
    } else {
      tableData.value = []
      paginationData.total = 0
    }
  } catch (error) {
    console.error("获取通知列表失败", error)
    tableData.value = []
    paginationData.total = 0
  } finally {
    loading.value = false
  }
}

// 刷新数据
function refreshData() {
  paginationData.currentPage = 1
  getTableData()
}

// 初始加载
getTableData()

// ==================== 格式化函数 ====================

// 计算序号
function getRowIndex(index: number): number {
  return (paginationData.currentPage - 1) * paginationData.pageSize + index + 1
}

// 获取分类名称
function getCategoryName(category: string): string {
  return categoryLabelMap[category] || category
}

// 获取通知类型名称
function getTypeName(type: string): string {
  return typeLabelMap[type] || type
}

// 获取状态标签
function getStatusLabel(item: NoticeListItem): string {
  const status = getDisplayStatus(item)
  return displayStatusLabelMap[status] || status
}

// 获取状态样式
function getStatusType(item: NoticeListItem) {
  const status = getDisplayStatus(item)
  return (displayStatusStyleMap[status]?.type || "info") as "primary" | "success" | "warning" | "info" | "danger"
}

// 格式化发布时间（优先使用 scheduledTimeStr + 时区，否则格式化 sentAt）
function formatPublishTime(item: NoticeListItem): string {
  // 优先使用 scheduledTimeStr（已格式化），并附加时区
  if (item.scheduledTimeStr) {
    if (item.timezone) {
      return `${item.scheduledTimeStr} (${item.timezone})`
    }
    return item.scheduledTimeStr
  }
  // 否则使用 sentAt（需格式化，后端返回秒级时间戳）
  if (item.sentAt) {
    return formatDateTime(item.sentAt * 1000)
  }
  return "-"
}

// 格式化定时发布时间（使用后端返回的 scheduledTimeStr，已包含时区转换）
function formatScheduledTime(item: NoticeListItem): string {
  // 优先使用后端返回的格式化字符串（已包含时区转换）
  if (item.scheduledTimeStr) {
    // 如果有时区信息，则在时间后面显示
    if (item.timezone) {
      return `${item.scheduledTimeStr} (${item.timezone})`
    }
    return item.scheduledTimeStr
  }
  return "-"
}

// ==================== 操作函数 ====================

// 新增通知
function handleAddNotice() {
  router.push("/notice/add")
}

// 查看详情
function handleDetail(row: NoticeListItem) {
  const query: Record<string, string> = {}
  // 传递定时发布时间信息
  if (row.scheduledTimeStr) {
    query.scheduledTimeStr = row.scheduledTimeStr
  }
  if (row.timezone) {
    query.timezone = row.timezone
  }
  router.push({
    path: `/notice/detail/${row.id}`,
    query
  })
}

// 编辑通知
function handleEdit(row: NoticeListItem) {
  router.push(`/notice/edit/${row.id}`)
}

// 撤回/取消通知
async function handleCancel(row: NoticeListItem) {
  const status = getDisplayStatus(row)
  const actionText = status === NoticeDisplayStatus.Published ? "撤回" : "取消发布"

  try {
    await ElMessageBox.confirm(
      `确定要${actionText}通知"${row.title}"吗？`,
      "确认操作",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )

    const res = await cancelNoticeApi(row.id)
    if (res.code === 0) {
      ElMessage.success(`${actionText}成功`)
      refreshData()
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error(`${actionText}失败`, error)
    }
  }
}

// ==================== 分页处理 ====================
function handleSizeChange(value: number) {
  changePageSize(value)
  getTableData()
}

function handleCurrentChange(value: number) {
  changeCurrentPage(value)
  getTableData()
}

// ==================== 计算操作按钮显示 ====================
const showEditButton = computed(() => (item: NoticeListItem) => {
  const status = getDisplayStatus(item)
  return status === NoticeDisplayStatus.Draft
    || status === NoticeDisplayStatus.Scheduled
    || status === NoticeDisplayStatus.Cancelled
})

const showCancelButton = computed(() => (item: NoticeListItem) => {
  const status = getDisplayStatus(item)
  return status === NoticeDisplayStatus.Scheduled
})

const showWithdrawButton = computed(() => (_item: NoticeListItem) => {
  // 已发布状态不显示撤回按钮
  return false
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" class="notice-card">
      <!-- Tab 切换 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="已发布" name="published" />
        <el-tab-pane label="待发布" name="pending" />
      </el-tabs>

      <!-- 已发布 tab 下的子 tab -->
      <el-tabs
        v-if="activeTab === 'published'"
        v-model="publishedSubTab"
        class="published-sub-tabs"
        @tab-change="handlePublishedSubTabChange"
      >
        <el-tab-pane label="手动通知" name="manual" />
        <el-tab-pane label="自动通知" name="auto" />
      </el-tabs>

      <!-- 搜索区域 -->
      <div class="search-wrapper">
        <div class="search-left">
          <el-input
            v-model="searchFormData.keyword"
            placeholder="请输入"
            clearable
            style="width: 260px"
            @keyup.enter="handleSearch"
          >
            <template #suffix>
              <el-icon class="search-icon" @click="handleSearch">
                <Search />
              </el-icon>
            </template>
          </el-input>
          <el-select
            v-if="activeTab === 'pending'"
            v-model="searchFormData.status"
            placeholder="选择状态"
            clearable
            style="width: 180px"
            @change="handleSearch"
          >
            <el-option
              v-for="item in pendingStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </div>
        <div v-if="!(activeTab === 'published' && publishedSubTab === 'auto')" class="search-right">
          <el-button type="primary" @click="handleAddNotice">
            + 新增通知
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-wrapper">
        <el-table v-loading="loading" :data="tableData">
          <el-table-column label="序号" width="60" align="center">
            <template #default="{ $index }">
              {{ getRowIndex($index) }}
            </template>
          </el-table-column>

          <el-table-column prop="title" label="通知标题" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button link type="primary" @click="handleDetail(row)">
                {{ row.title }}
              </el-button>
            </template>
          </el-table-column>

          <el-table-column prop="summary" label="内容简介" min-width="200">
            <template #default="{ row }">
              <span class="summary-text">{{ row.summary || "-" }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="category" label="分类" width="100">
            <template #default="{ row }">
              {{ getCategoryName(row.category) }}
            </template>
          </el-table-column>

          <el-table-column prop="type" label="通知类型" width="100">
            <template #default="{ row }">
              {{ getTypeName(row.type) }}
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row)" size="small">
                {{ getStatusLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column v-if="activeTab === 'pending'" prop="scheduledAt" label="定时发布时间" width="300">
            <template #default="{ row }">
              {{ formatScheduledTime(row) }}
            </template>
          </el-table-column>

          <el-table-column v-if="activeTab === 'published'" prop="sentAt" label="发布时间" width="170" sortable>
            <template #default="{ row }">
              {{ formatPublishTime(row) }}
            </template>
          </el-table-column>

          <el-table-column v-if="activeTab !== 'published'" label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="showEditButton(row)"
                link
                type="primary"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                v-if="showCancelButton(row)"
                link
                type="danger"
                @click="handleCancel(row)"
              >
                取消发布
              </el-button>
              <el-button
                v-if="showWithdrawButton(row)"
                link
                type="danger"
                @click="handleCancel(row)"
              >
                撤回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

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

<style scoped lang="scss">
.notice-card {
  :deep(.el-card__body) {
    padding-top: 0;
  }

  :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }
}

.published-sub-tabs {
  margin-top: -8px;
  margin-bottom: 8px;

  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }

  :deep(.el-tabs__item) {
    font-size: 13px;
    padding: 0 16px;
    height: 32px;
    line-height: 32px;
  }
}

.search-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .search-left {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .search-icon {
    cursor: pointer;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.table-wrapper {
  margin-bottom: 16px;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
}

.summary-text {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}
</style>
