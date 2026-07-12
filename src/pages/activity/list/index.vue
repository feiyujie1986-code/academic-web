<script lang="ts" setup>
import type { ActivityListItem } from "@/api/activity/activity"
import type { ActivityCategoryItem } from "@/api/activity/category"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import draggable from "vuedraggable"
import {
  ActivityFeeType,
  ActivityStatus,
  activityStatusLabelMap,
  activityStatusTagTypeMap,
  deleteActivityApi,
  feeTypeLabelMap,
  getActivityListApi,
  sortActivitiesApi,
  updateActivityStatusApi
} from "@/api/activity/activity"
import { getAllCategoriesApi } from "@/api/activity/category"
import ActivityFormDrawer from "../components/ActivityFormDrawer.vue"
import RegistrationDialog from "../components/RegistrationDialog.vue"

defineOptions({ name: "ActivityList" })

// ========== 分类选项 ==========
const categoryOptions = ref<ActivityCategoryItem[]>([])

async function loadCategories() {
  try {
    const res = await getAllCategoriesApi()
    if (res.code === 0) categoryOptions.value = res.data
  } catch (error) {
    console.error(error)
  }
}

loadCategories()

// ========== 搜索 ==========
const searchFormData = reactive({
  keyword: "",
  categoryId: undefined as number | undefined,
  status: undefined as ActivityStatus | undefined
})

const statusOptions = Object.entries(activityStatusLabelMap).map(([value, label]) => ({
  value: Number(value),
  label
}))

function handleSearch() {
  paginationData.currentPage = 1
  getTableData()
}

function resetSearch() {
  searchFormData.keyword = ""
  searchFormData.categoryId = undefined
  searchFormData.status = undefined
  handleSearch()
}

// ========== 表格数据 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()
const loading = ref(false)
const tableData = ref<ActivityListItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getActivityListApi({
      keyword: searchFormData.keyword || undefined,
      categoryId: searchFormData.categoryId,
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

// ========== 时间展示 ==========
function getTimeLabel(item: ActivityListItem): string {
  if (!item.startTime) return "未设置"
  const start = formatDateTime(item.startTime * 1000, "MM-DD HH:mm")
  if (!item.endTime) return start
  const end = formatDateTime(item.endTime * 1000, "MM-DD HH:mm")
  return `${start} 至 ${end}`
}

// ========== 人数展示 ==========
function getCapacityLabel(item: ActivityListItem): string {
  const max = item.maxParticipants === 0 ? "不限" : String(item.maxParticipants)
  return `${item.registeredCount} / ${max}`
}

// ========== 拖拽排序 ==========
const sortLoading = ref(false)

async function handleDragEnd() {
  sortLoading.value = true
  try {
    const items = tableData.value.map((item, index) => ({
      id: item.id,
      sortOrder: paginationData.pageSize * (paginationData.currentPage - 1) + index + 1
    }))
    const res = await sortActivitiesApi(items)
    if (res.code === 0) {
      ElMessage.success("排序已更新")
      getTableData()
    }
  } catch (error) {
    console.error(error)
    getTableData()
  } finally {
    sortLoading.value = false
  }
}

// ========== 状态变更 ==========
const statusLoading = ref<number | null>(null)

async function handleStatusChange(row: ActivityListItem, newStatus: ActivityStatus) {
  const actionMap: Record<ActivityStatus, string> = {
    [ActivityStatus.Draft]: "撤回草稿",
    [ActivityStatus.Published]: "发布",
    [ActivityStatus.Cancelled]: "取消",
    [ActivityStatus.Ended]: "结束"
  }
  try {
    await ElMessageBox.confirm(`确认${actionMap[newStatus]}该活动？`, "确认操作", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: "warning"
    })
    statusLoading.value = row.id
    const res = await updateActivityStatusApi(row.id, newStatus)
    if (res.code === 0) {
      ElMessage.success("状态已更新")
      getTableData()
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    statusLoading.value = null
  }
}

// ========== 新增/编辑 ==========
const formDrawerVisible = ref(false)
const editData = ref<ActivityListItem | null>(null)

function handleAdd() {
  editData.value = null
  formDrawerVisible.value = true
}

function handleEdit(row: ActivityListItem) {
  editData.value = row
  formDrawerVisible.value = true
}

function handleFormSuccess() {
  getTableData()
}

// ========== 删除 ==========
const deleteLoading = ref<number | null>(null)

async function handleDelete(row: ActivityListItem) {
  try {
    await ElMessageBox.confirm("删除后无法恢复，确认删除该活动？", "确认删除", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })
    deleteLoading.value = row.id
    const res = await deleteActivityApi(row.id)
    if (res.code === 0) {
      ElMessage.success("删除成功")
      getTableData()
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    deleteLoading.value = null
  }
}

// ========== 报名人员 ==========
const registrationDialogVisible = ref(false)
const currentActivity = ref<ActivityListItem | null>(null)

function handleViewRegistrations(row: ActivityListItem) {
  currentActivity.value = row
  registrationDialogVisible.value = true
}

function handleRegistrationChanged() {
  getTableData()
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索卡片 -->
    <el-card shadow="never" class="search-wrapper">
      <el-form :inline="true" :model="searchFormData">
        <el-form-item label="关键词">
          <el-input
            v-model="searchFormData.keyword"
            placeholder="请输入活动名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="searchFormData.categoryId"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
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
    <el-card v-loading="loading || sortLoading" shadow="never">
      <div class="toolbar-wrapper">
        <el-button type="primary" icon="Plus" @click="handleAdd">
          新增活动
        </el-button>
        <el-tooltip content="刷新" effect="light">
          <el-button type="primary" icon="RefreshRight" circle plain @click="getTableData" />
        </el-tooltip>
      </div>

      <WarningBar
        title="拖动左侧 ⠿ 图标可调整活动展示顺序，调整后自动保存（排序仅在当前页内生效）"
        class="sort-tip"
      />

      <draggable
        v-model="tableData"
        item-key="id"
        handle=".drag-handle"
        ghost-class="drag-ghost"
        class="activity-list"
        @end="handleDragEnd"
      >
        <template #item="{ element: row }">
          <div class="activity-card">
            <el-icon class="drag-handle">
              <Rank />
            </el-icon>

            <!-- 封面图 -->
            <el-image
              :src="row.coverImage"
              fit="cover"
              class="activity-cover"
              :preview-src-list="row.coverImage ? [row.coverImage] : []"
            >
              <template #error>
                <div class="cover-placeholder">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>

            <!-- 活动信息 -->
            <div class="activity-info">
              <div class="activity-title-row">
                <span class="activity-title">{{ row.title }}</span>
                <el-tag
                  :type="activityStatusTagTypeMap[row.status] as any"
                  size="small"
                >
                  {{ activityStatusLabelMap[row.status] }}
                </el-tag>
                <el-tag size="small" :type="row.feeType === ActivityFeeType.Paid ? 'warning' : 'info'">
                  {{ feeTypeLabelMap[row.feeType] }}
                </el-tag>
                <el-tag v-if="row.feeType === ActivityFeeType.Paid && !row.onlinePaymentEnabled" size="small" type="danger">
                  已关闭线上支付
                </el-tag>
                <el-tag size="small" type="info">
                  排序 {{ row.sortOrder }}
                </el-tag>
                <el-tag size="small" type="info">
                  ID {{ row.id }}
                </el-tag>
              </div>
              <div class="activity-meta">
                <span>分类：{{ row.categoryName || "-" }}</span>
                <span v-if="row.location">地点：{{ row.location }}</span>
                <span>时间：{{ getTimeLabel(row) }}</span>
                <span>报名：{{ getCapacityLabel(row) }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="activity-actions">
              <!-- 状态操作按钮（根据当前状态动态显示） -->
              <el-button
                v-if="row.status === ActivityStatus.Draft"
                type="success"
                size="small"
                :loading="statusLoading === row.id"
                @click="handleStatusChange(row, ActivityStatus.Published)"
              >
                发布
              </el-button>
              <el-button
                v-if="row.status === ActivityStatus.Published"
                type="warning"
                size="small"
                :loading="statusLoading === row.id"
                @click="handleStatusChange(row, ActivityStatus.Cancelled)"
              >
                取消
              </el-button>
              <el-button
                v-if="row.status === ActivityStatus.Published"
                type="info"
                size="small"
                :loading="statusLoading === row.id"
                @click="handleStatusChange(row, ActivityStatus.Ended)"
              >
                结束
              </el-button>

              <el-button type="primary" link @click="handleViewRegistrations(row)">
                报名人员
              </el-button>

              <el-dropdown trigger="click">
                <el-button type="primary" link>
                  更多
                  <el-icon class="el-icon--right">
                    <ArrowDown />
                  </el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-if="row.status === ActivityStatus.Draft || row.status === ActivityStatus.Published"
                      @click="handleEdit(row)"
                    >
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="row.status !== ActivityStatus.Published"
                      :disabled="deleteLoading === row.id"
                      @click="handleDelete(row)"
                    >
                      <span style="color: var(--el-color-danger)">删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
      </draggable>

      <el-empty v-if="!loading && tableData.length === 0" description="暂无活动" />

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

    <!-- 新增/编辑 Drawer -->
    <ActivityFormDrawer
      v-model:visible="formDrawerVisible"
      :edit-data="editData"
      @success="handleFormSuccess"
    />

    <!-- 报名人员 Dialog -->
    <RegistrationDialog
      v-model:visible="registrationDialogVisible"
      :activity-id="currentActivity?.id ?? null"
      :activity-title="currentActivity?.title ?? ''"
      :max-participants="currentActivity?.maxParticipants ?? 0"
      :registered-count="currentActivity?.registeredCount ?? 0"
      :fee-type="currentActivity?.feeType ?? ActivityFeeType.Free"
      @changed="handleRegistrationChanged"
    />
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

.sort-tip {
  margin-bottom: 16px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.activity-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
}

.drag-handle {
  cursor: grab;
  font-size: 18px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.drag-ghost {
  opacity: 0.4;
}

.activity-cover {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid var(--el-border-color-lighter);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 24px;
}

.activity-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.activity-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.activity-title {
  font-weight: 600;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-meta {
  display: flex;
  gap: 16px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  flex-wrap: wrap;
}

.activity-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
}
</style>
