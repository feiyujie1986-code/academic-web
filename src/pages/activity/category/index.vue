<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { ActivityCategoryItem } from "@/api/activity/category"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import {
  addCategoryApi,
  CategoryStatus,
  categoryStatusLabelMap,
  deleteCategoryApi,
  editCategoryApi,
  getCategoryListApi
} from "@/api/activity/category"

defineOptions({ name: "ActivityCategory" })

// ========== 搜索 ==========
const searchFormData = reactive({
  keyword: "",
  status: undefined as CategoryStatus | undefined
})

const statusOptions = Object.entries(categoryStatusLabelMap).map(([value, label]) => ({
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
const tableData = ref<ActivityCategoryItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getCategoryListApi({
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

// ========== 新增/编辑 Dialog ==========
const dialogVisible = ref(false)
const dialogTitle = ref("新增分类")
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const formData = reactive({
  name: "",
  sortOrder: 0,
  status: CategoryStatus.Active
})

const formRules: FormRules = {
  name: [
    { required: true, message: "请输入分类名称", trigger: "blur" },
    { max: 30, message: "分类名称最多 30 个字", trigger: "blur" }
  ],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
}

function resetForm() {
  formData.name = ""
  formData.sortOrder = 0
  formData.status = CategoryStatus.Active
  formRef.value?.clearValidate()
}

function handleAdd() {
  editingId.value = null
  dialogTitle.value = "新增分类"
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: ActivityCategoryItem) {
  editingId.value = row.id
  dialogTitle.value = "编辑分类"
  formData.name = row.name
  formData.sortOrder = row.sortOrder
  formData.status = row.status
  dialogVisible.value = true
}

function handleDialogClose() {
  dialogVisible.value = false
  resetForm()
}

const submitLoading = ref(false)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      const params = {
        name: formData.name,
        sortOrder: formData.sortOrder,
        status: formData.status
      }
      const res = editingId.value
        ? await editCategoryApi(editingId.value, params)
        : await addCategoryApi(params)
      if (res.code === 0) {
        ElMessage.success(editingId.value ? "编辑成功" : "新增成功")
        handleDialogClose()
        getTableData()
      }
    } catch (error) {
      console.error(error)
    } finally {
      submitLoading.value = false
    }
  })
}

// ========== 删除 ==========
const deleteLoading = ref<number | null>(null)

async function handleDelete(row: ActivityCategoryItem) {
  try {
    await ElMessageBox.confirm("删除分类后，若该分类下有活动将无法删除。确认删除？", "确认删除", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })
    deleteLoading.value = row.id
    const res = await deleteCategoryApi(row.id)
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
        <el-form-item label="名称">
          <el-input
            v-model="searchFormData.keyword"
            placeholder="请输入分类名称"
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
        <el-button type="primary" icon="Plus" @click="handleAdd">
          新增分类
        </el-button>
        <el-tooltip content="刷新" effect="light">
          <el-button type="primary" icon="RefreshRight" circle plain @click="getTableData" />
        </el-tooltip>
      </div>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="name" label="分类名称" min-width="160" />
        <el-table-column prop="sortOrder" label="排序权重" width="110" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === CategoryStatus.Active ? 'success' : 'info'" size="small">
              {{ categoryStatusLabelMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt * 1000) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
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
          </template>
        </el-table-column>
      </el-table>

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

    <!-- 新增/编辑 Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="480px"
      :close-on-click-modal="false"
      :before-close="handleDialogClose"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="90px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入分类名称，最多 30 字"
            maxlength="30"
            show-word-limit
            clearable
          />
        </el-form-item>
        <el-form-item label="排序权重" prop="sortOrder">
          <el-input-number
            v-model="formData.sortOrder"
            :min="0"
            :max="9999"
            controls-position="right"
          />
          <span class="form-tip">值越大越靠前</span>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="CategoryStatus.Active">
              启用
            </el-radio>
            <el-radio :value="CategoryStatus.Inactive">
              禁用
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleDialogClose">
          取消
        </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确认
        </el-button>
      </template>
    </el-dialog>
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

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
