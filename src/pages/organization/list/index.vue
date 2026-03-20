<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { OrganizationModel } from "@/api/organization/organization"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { reactive, ref } from "vue"
import {
  addOrganizationApi,
  deleteOrganizationApi,
  editOrganizationApi,
  getOrganizationsApi
} from "@/api/organization/organization"

defineOptions({
  name: "OrganizationList"
})

const loading = ref<boolean>(false)
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

const searchFormData = reactive({
  name: ""
})

function handleSearch() {
  paginationData.currentPage = 1
  paginationData.pageSize = 10
  getTableData()
}

function resetSearch() {
  searchFormData.name = ""
}

const tableData = ref<OrganizationModel[]>([])
let activeRow: OrganizationModel

async function getTableData() {
  loading.value = true
  try {
    const res = await getOrganizationsApi({
      name: searchFormData.name || undefined,
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    })
    if (res.code === 0) {
      tableData.value = res.data.list.map((item) => {
        item.createdDate = formatDateTime(item.createdAt * 1000)
        item.updatedDate = formatDateTime(item.updatedAt * 1000)
        return item
      })
      paginationData.total = res.data.total
    }
  } catch (error) {
    console.log(error)
  }
  loading.value = false
}
getTableData()

// 添加、编辑机构对话框
const dialogVisible = ref<boolean>(false)
const formRef = ref<FormInstance>()
const formData = reactive({
  name: "",
  remark: ""
})

const formRules: FormRules = reactive({
  name: [{ required: true, trigger: "blur", message: "请填写机构名称" }]
})

const kind = ref("")
const title = ref("")
const submitting = ref(false)

function initForm() {
  formRef.value?.resetFields()
  formData.name = ""
  formData.remark = ""
}

function handleClose(done: () => void) {
  initForm()
  done()
}

function addDialog() {
  kind.value = "Add"
  title.value = "新增机构"
  dialogVisible.value = true
}

function editDialog(row: OrganizationModel) {
  activeRow = row
  formData.name = row.name
  formData.remark = row.remark
  kind.value = "Edit"
  title.value = "编辑机构"
  dialogVisible.value = true
}

function closeDialog() {
  formRef.value?.resetFields()
  initForm()
  dialogVisible.value = false
}

function operateAction(formEl: FormInstance | undefined) {
  if (!formEl) return
  formEl.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (kind.value === "Add") {
          const res = await addOrganizationApi({
            name: formData.name,
            remark: formData.remark
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            await getTableData()
          }
        } else if (kind.value === "Edit") {
          const res = await editOrganizationApi({
            id: activeRow.id,
            name: formData.name,
            remark: formData.remark
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            await getTableData()
          }
        }
        closeDialog()
      } finally {
        submitting.value = false
      }
    }
  })
}

function deleteAction(row: OrganizationModel) {
  ElMessageBox.confirm("此操作将永久删除该机构, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      deleteOrganizationApi({ id: row.id }).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          getTableData()
        }
      })
    })
    .catch(() => {})
}

// 分页
function handleSizeChange(value: number) {
  changePageSize(value)
  getTableData()
}

function handleCurrentChange(value: number) {
  changeCurrentPage(value)
  getTableData()
}
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" class="search-wrapper">
      <el-form :inline="true" :model="searchFormData">
        <el-form-item prop="name" label="机构名称">
          <el-input v-model="searchFormData.name" placeholder="机构名称" clearable style="width: 200px" />
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
    <el-card v-loading="loading" shadow="never">
      <div class="toolbar-wrapper">
        <div>
          <el-button type="primary" icon="CirclePlus" @click="addDialog">
            新增
          </el-button>
        </div>
        <div>
          <el-tooltip content="刷新" effect="light">
            <el-button type="primary" icon="RefreshRight" circle plain @click="getTableData" />
          </el-tooltip>
        </div>
      </div>
      <div class="table-wrapper">
        <el-table :data="tableData">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="机构名称" />
          <el-table-column prop="remark" label="备注" show-overflow-tooltip />
          <el-table-column prop="createdDate" label="创建时间" width="180" />
          <el-table-column prop="updatedDate" label="更新时间" width="180" />
          <el-table-column fixed="right" label="操作" align="center" width="180">
            <template #default="scope">
              <el-button type="primary" text icon="Edit" size="small" @click="editDialog(scope.row)">
                编辑
              </el-button>
              <el-button type="danger" text icon="Delete" size="small" @click="deleteAction(scope.row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
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
    <el-dialog v-model="dialogVisible" :title="title" :before-close="handleClose" width="30%">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="right"
        style="width: 95%; margin-top: 15px"
      >
        <el-form-item label="机构名称" prop="name">
          <el-input
            v-model="formData.name"
            autocomplete="off"
            placeholder="请输入机构名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            autocomplete="off"
            placeholder="请输入备注"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDialog">
            取消
          </el-button>
          <el-button type="primary" :loading="submitting" @click="operateAction(formRef)">
            确认
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
