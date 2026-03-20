<script lang="ts" setup>
import type { FeedbackDataModel } from "@/api/feedback/feedback"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { deleteFeedbackApi, FeedbackType, FeedbackTypeMap, getFeedbacksApi } from "@/api/feedback/feedback"

defineOptions({ name: "FeedbackList" })

const router = useRouter()

// ========== 分页 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

// ========== 搜索表单 ==========
const loading = ref(false)
const searchFormData = reactive({
  type: undefined as FeedbackType | undefined
})

// 反馈类型选项
const feedbackTypeOptions = [
  { value: FeedbackType.Bug, label: FeedbackTypeMap[FeedbackType.Bug] },
  { value: FeedbackType.Suggestion, label: FeedbackTypeMap[FeedbackType.Suggestion] },
  { value: FeedbackType.Other, label: FeedbackTypeMap[FeedbackType.Other] }
]

function handleSearch() {
  paginationData.currentPage = 1
  getTableData()
}

function resetSearch() {
  searchFormData.type = undefined
  handleSearch()
}

// ========== 表格数据 ==========
const tableData = ref<FeedbackDataModel[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getFeedbacksApi({
      type: searchFormData.type,
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

// ========== 分页处理 ==========
function handleSizeChange(value: number) {
  changePageSize(value)
  getTableData()
}

function handleCurrentChange(value: number) {
  changeCurrentPage(value)
  getTableData()
}

// ========== 删除操作 ==========
const deleteLoading = ref<number | null>(null)

async function handleDelete(row: FeedbackDataModel) {
  try {
    await ElMessageBox.confirm("确定要删除该反馈记录吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })
    deleteLoading.value = row.id
    const res = await deleteFeedbackApi(row.id)
    if (res.code === 0) {
      ElMessage.success("删除成功")
      getTableData()
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error(error)
    }
  } finally {
    deleteLoading.value = null
  }
}

// ========== 查看详情 ==========
function handleViewDetail(row: FeedbackDataModel) {
  router.push({
    name: "FeedbackDetail",
    params: { id: row.id }
  })
}

// ========== 类型标签颜色 ==========
type TagType = "primary" | "success" | "warning" | "info" | "danger"

function getTypeTagType(type: FeedbackType): TagType {
  const typeMap: Record<FeedbackType, TagType> = {
    [FeedbackType.Bug]: "danger",
    [FeedbackType.Suggestion]: "warning",
    [FeedbackType.Other]: "info"
  }
  return typeMap[type] || "info"
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索卡片 -->
    <el-card shadow="never" class="search-wrapper">
      <el-form :inline="true" :model="searchFormData">
        <el-form-item label="反馈类型">
          <el-select
            v-model="searchFormData.type"
            placeholder="全部类型"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in feedbackTypeOptions"
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

    <!-- 表格卡片 -->
    <el-card v-loading="loading" shadow="never">
      <div class="toolbar-wrapper">
        <div />
        <el-tooltip content="刷新" effect="light">
          <el-button type="primary" icon="RefreshRight" circle plain @click="getTableData" />
        </el-tooltip>
      </div>

      <div class="table-wrapper">
        <el-table :data="tableData" style="width: 100%" row-key="id">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getTypeTagType(row.type)">
                {{ row.typeName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="反馈描述" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewDetail(row)">
                {{ row.description }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="submitterName" label="提交者" width="120" />
          <el-table-column prop="submitterEmail" label="邮箱" width="200" show-overflow-tooltip />
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt * 1000) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="140">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewDetail(row)">
                详情
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
  margin-bottom: 20px;
}

.table-wrapper {
  margin-bottom: 20px;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
}
</style>
