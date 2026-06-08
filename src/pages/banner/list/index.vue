<script lang="ts" setup>
import type { BannerListItem } from "@/api/banner/banner"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import draggable from "vuedraggable"
import {
  BannerStatus,
  deleteBannerApi,
  getBannerListApi,
  linkTypeLabelMap,
  sortBannersApi,
  statusLabelMap,
  updateBannerStatusApi
} from "@/api/banner/banner"
import BannerFormModal from "../components/BannerFormModal.vue"

defineOptions({ name: "BannerList" })

// ========== 搜索表单 ==========
const searchFormData = reactive({
  keyword: "",
  status: undefined as BannerStatus | undefined
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
const tableData = ref<BannerListItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getBannerListApi({
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

// ========== 跳转目标展示 ==========
function getLinkLabel(item: BannerListItem): string {
  const typeLabel = linkTypeLabelMap[item.linkType] ?? String(item.linkType)
  if (!item.linkTarget) return typeLabel
  return `${typeLabel}：${item.linkTarget}`
}

// ========== 生效时间展示 ==========
function getTimeRangeLabel(item: BannerListItem): string {
  if (!item.startTime && !item.endTime) return "不限制"
  const start = item.startTime ? formatDateTime(item.startTime * 1000) : "不限"
  const end = item.endTime ? formatDateTime(item.endTime * 1000) : "不限"
  return `${start} 至 ${end}`
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
    const res = await sortBannersApi(items)
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

// ========== 启用/禁用 ==========
const statusLoading = ref<number | null>(null)

function handleStatusToggle(row: BannerListItem, value: string | number | boolean) {
  handleStatusChange(row, value ? BannerStatus.Active : BannerStatus.Inactive)
}

async function handleStatusChange(row: BannerListItem, value: BannerStatus) {
  const previous = row.status
  row.status = value
  statusLoading.value = row.id
  try {
    const res = await updateBannerStatusApi(row.id, value)
    if (res.code === 0) {
      ElMessage.success(value === BannerStatus.Active ? "已启用" : "已禁用")
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

// ========== 新增/编辑 ==========
const formModalVisible = ref(false)
const editData = ref<BannerListItem | null>(null)

function handleAdd() {
  editData.value = null
  formModalVisible.value = true
}

function handleEdit(row: BannerListItem) {
  editData.value = row
  formModalVisible.value = true
}

function handleFormSuccess() {
  getTableData()
}

// ========== 删除 ==========
const deleteLoading = ref<number | null>(null)

async function handleDelete(row: BannerListItem) {
  try {
    await ElMessageBox.confirm("删除后无法恢复，确认删除该 Banner？", "确认删除", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })
    deleteLoading.value = row.id
    const res = await deleteBannerApi(row.id)
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
</script>

<template>
  <div class="app-container">
    <!-- 搜索卡片 -->
    <el-card shadow="never" class="search-wrapper">
      <el-form :inline="true" :model="searchFormData">
        <el-form-item label="标题">
          <el-input
            v-model="searchFormData.keyword"
            placeholder="请输入标题关键词"
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
    <el-card v-loading="loading || sortLoading" shadow="never">
      <div class="toolbar-wrapper">
        <el-button type="primary" icon="Plus" @click="handleAdd">
          新增 Banner
        </el-button>
        <el-tooltip content="刷新" effect="light">
          <el-button type="primary" icon="RefreshRight" circle plain @click="getTableData" />
        </el-tooltip>
      </div>

      <WarningBar
        title="拖动卡片左侧的 ⠿ 图标可调整轮播顺序，调整后将自动保存（排序仅在当前页内生效）"
        class="sort-tip"
      />

      <draggable
        v-model="tableData"
        item-key="id"
        handle=".drag-handle"
        ghost-class="drag-ghost"
        class="banner-list"
        @end="handleDragEnd"
      >
        <template #item="{ element: row }">
          <div class="banner-card">
            <el-icon class="drag-handle">
              <Rank />
            </el-icon>

            <el-image :src="row.imageUrl" fit="cover" class="banner-thumb" :preview-src-list="[row.imageUrl]" />

            <div class="banner-info">
              <div class="banner-title-row">
                <span class="banner-title">{{ row.title || "（未设置标题）" }}</span>
                <el-tag size="small" type="info">
                  排序 {{ row.sortOrder }}
                </el-tag>
              </div>
              <div class="banner-subtitle">
                {{ row.subtitle || "（未设置副标题）" }}
              </div>
              <div class="banner-meta">
                <span>跳转：{{ getLinkLabel(row) }}</span>
                <span>生效时间：{{ getTimeRangeLabel(row) }}</span>
                <span>更新于 {{ formatDateTime(row.updatedAt * 1000) }}</span>
              </div>
            </div>

            <div class="banner-actions">
              <el-switch
                :model-value="row.status === BannerStatus.Active"
                :loading="statusLoading === row.id"
                active-text="启用"
                inactive-text="禁用"
                inline-prompt
                @change="(value) => handleStatusToggle(row, value)"
              />
              <el-button type="primary" link @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button
                type="danger"
                link
                :loading="deleteLoading === row.id"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>
      </draggable>

      <el-empty v-if="!loading && tableData.length === 0" description="暂无 Banner" />

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

    <!-- 新增/编辑弹窗 -->
    <BannerFormModal
      v-model:visible="formModalVisible"
      :edit-data="editData"
      @success="handleFormSuccess"
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

.banner-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.banner-card {
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
}

.drag-ghost {
  opacity: 0.4;
}

.banner-thumb {
  width: 160px;
  height: 80px;
  border-radius: 4px;
  flex-shrink: 0;
}

.banner-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.banner-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-title {
  font-weight: 600;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-subtitle {
  color: var(--el-text-color-regular);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-meta {
  display: flex;
  gap: 16px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  flex-wrap: wrap;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
}
</style>
