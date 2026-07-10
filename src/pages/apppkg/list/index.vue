<script lang="ts" setup>
import type { AppPackageItem, AppPackagePlatform } from "@/api/apppkg/apppkg"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import {
  deleteAppPackageApi,
  getAppPackageListApi,
  platformLabelMap,
  refreshAppPackageQrCodeApi
} from "@/api/apppkg/apppkg"
import AppPackageUploadModal from "../components/AppPackageUploadModal.vue"

defineOptions({ name: "AppPackageList" })

// ========== 搜索表单 ==========
const searchFormData = reactive({
  platform: undefined as AppPackagePlatform | undefined,
  scope: ""
})

const platformOptions = Object.entries(platformLabelMap).map(([value, label]) => ({
  value: Number(value),
  label
}))

function handleSearch() {
  paginationData.currentPage = 1
  getTableData()
}

function resetSearch() {
  searchFormData.platform = undefined
  searchFormData.scope = ""
  handleSearch()
}

// ========== 表格数据 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()
const loading = ref(false)
const tableData = ref<AppPackageItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getAppPackageListApi({
      platform: searchFormData.platform,
      scope: searchFormData.scope || undefined,
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

// ========== 文件大小展示 ==========
function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// ========== 有效期状态 ==========
const EXPIRING_SOON_SECONDS = 7 * 24 * 60 * 60 // 7 天内视为即将过期

type ExpireState = "permanent" | "normal" | "expiringSoon" | "expired"

function getExpireState(expiresAt: number): ExpireState {
  if (!expiresAt) return "permanent"
  const remaining = expiresAt - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return "expired"
  if (remaining <= EXPIRING_SOON_SECONDS) return "expiringSoon"
  return "normal"
}

const expireStateLabelMap: Record<ExpireState, string> = {
  permanent: "永久有效",
  normal: "有效",
  expiringSoon: "即将过期",
  expired: "已过期"
}

const expireStateTagTypeMap: Record<ExpireState, "success" | "warning" | "danger" | "info"> = {
  permanent: "info",
  normal: "success",
  expiringSoon: "warning",
  expired: "danger"
}

// ========== 二维码预览 ==========
const qrPreviewVisible = ref(false)
const qrPreviewUrl = ref("")

function handleViewQrCode(row: AppPackageItem) {
  qrPreviewUrl.value = row.qrCodeUrl
  qrPreviewVisible.value = true
}

// ========== 复制下载链接 ==========
async function handleCopyDownloadUrl(row: AppPackageItem) {
  try {
    await navigator.clipboard.writeText(row.downloadUrl)
    ElMessage.success("下载链接已复制")
  } catch {
    ElMessage.error("复制失败，请手动复制")
  }
}

// ========== 上传 ==========
const uploadModalVisible = ref(false)

function handleUpload() {
  uploadModalVisible.value = true
}

function handleUploadSuccess() {
  getTableData()
}

// ========== 刷新二维码 ==========
const refreshLoading = ref<number | null>(null)

async function handleRefreshQrCode(row: AppPackageItem) {
  try {
    await ElMessageBox.confirm(
      "刷新后旧的二维码和下载链接将立即失效，确认刷新？",
      "确认刷新",
      { confirmButtonText: "确认刷新", cancelButtonText: "取消", type: "warning" }
    )
    refreshLoading.value = row.id
    const res = await refreshAppPackageQrCodeApi(row.id)
    if (res.code === 0) {
      ElMessage.success("刷新成功")
      getTableData()
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    refreshLoading.value = null
  }
}

// ========== 删除 ==========
const deleteLoading = ref<number | null>(null)

async function handleDelete(row: AppPackageItem) {
  try {
    await ElMessageBox.confirm("删除后无法恢复，确认删除该安装包？", "确认删除", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })
    deleteLoading.value = row.id
    const res = await deleteAppPackageApi(row.id)
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
        <el-form-item label="平台">
          <el-select
            v-model="searchFormData.platform"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="item in platformOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分发范围">
          <el-input
            v-model="searchFormData.scope"
            placeholder="请输入分发范围"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
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
        <el-button type="primary" icon="Plus" @click="handleUpload">
          上传安装包
        </el-button>
        <el-tooltip content="刷新" effect="light">
          <el-button type="primary" icon="RefreshRight" circle plain @click="getTableData" />
        </el-tooltip>
      </div>

      <el-table :data="tableData" border style="width: 100%">
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">
            {{ getRowIndex($index) }}
          </template>
        </el-table-column>
        <el-table-column label="平台" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.platform === 1 ? 'success' : 'primary'">
              {{ platformLabelMap[row.platform] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="版本号" min-width="140">
          <template #default="{ row }">
            <div>{{ row.versionName }}</div>
            <div v-if="row.versionCode" class="sub-text">
              build {{ row.versionCode }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="100" align="center">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column label="分发范围" width="120">
          <template #default="{ row }">
            {{ row.scope || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="下载次数" width="100" align="center">
          <template #default="{ row }">
            {{ row.downloadCount }}
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="expireStateTagTypeMap[getExpireState(row.expiresAt)]">
              {{ expireStateLabelMap[getExpireState(row.expiresAt)] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" width="170" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt * 1000) }}
          </template>
        </el-table-column>
        <el-table-column label="二维码" width="220" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewQrCode(row)">
              查看二维码
            </el-button>
            <el-button type="primary" link @click="handleCopyDownloadUrl(row)">
              复制链接
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :loading="refreshLoading === row.id"
              @click="handleRefreshQrCode(row)"
            >
              刷新二维码
            </el-button>
            <el-button
              type="danger"
              link
              :loading="deleteLoading === row.id"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && tableData.length === 0" description="暂无安装包" />

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

    <!-- 上传弹窗 -->
    <AppPackageUploadModal
      v-model:visible="uploadModalVisible"
      @success="handleUploadSuccess"
    />

    <!-- 二维码预览 -->
    <el-image-viewer
      v-if="qrPreviewVisible"
      :url-list="[qrPreviewUrl]"
      @close="qrPreviewVisible = false"
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

.sub-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
