<script lang="ts" setup>
import type { TeachingFeedbackDataModel } from "@/api/feedback/teachingFeedback"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { ElMessage, ElMessageBox } from "element-plus"
import { deleteTeachingFeedbackApi, getTeachingFeedbacksApi } from "@/api/feedback/teachingFeedback"

defineOptions({ name: "TeachingFeedbackList" })

const router = useRouter()

// ========== 分页 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

// ========== 表格数据 ==========
const loading = ref(false)
const tableData = ref<TeachingFeedbackDataModel[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getTeachingFeedbacksApi({
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

// ========== 查看详情 ==========
function handleViewDetail(row: TeachingFeedbackDataModel) {
  router.push({
    name: "TeachingFeedbackDetail",
    params: { id: row.id }
  })
}

// ========== 删除 ==========
async function handleDelete(row: TeachingFeedbackDataModel) {
  try {
    await ElMessageBox.confirm(
      "确定要删除该教学反馈吗？",
      "确认删除",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )

    const res = await deleteTeachingFeedbackApi(row.id)
    if (res.code === 0) {
      ElMessage.success("删除成功")
      getTableData()
    } else {
      ElMessage.error(res.msg || "删除失败")
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除失败", error)
      ElMessage.error("删除失败，请重试")
    }
  }
}
</script>

<template>
  <div class="app-container">
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
          <el-table-column prop="typeName" label="意见类型" width="140">
            <template #default="{ row }">
              <el-tag>{{ row.typeName }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="意见描述" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewDetail(row)">
                {{ row.content }}
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
              <el-button type="danger" link @click="handleDelete(row)">
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
