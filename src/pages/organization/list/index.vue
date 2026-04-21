<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { GroupMember } from "@/api/member/memberGroup"
import type { OrganizationModel } from "@/api/organization/organization"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { getUserTypeLabelStyle } from "@@/utils/userTypeLabel"
import { reactive, ref } from "vue"
import { getMemberGroupMembersApi } from "@/api/member/memberGroup"
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

// 添加、编辑小组对话框
const dialogVisible = ref<boolean>(false)
const formRef = ref<FormInstance>()
const formData = reactive({
  name: "",
  remark: ""
})

const formRules: FormRules = reactive({
  name: [{ required: true, trigger: "blur", message: "请填写小组名称" }]
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
  title.value = "新增小组"
  dialogVisible.value = true
}

function editDialog(row: OrganizationModel) {
  activeRow = row
  formData.name = row.name
  formData.remark = row.remark
  kind.value = "Edit"
  title.value = "编辑小组"
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
  ElMessageBox.confirm("此操作将永久删除该小组, 是否继续?", "提示", {
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

// 查看小组成员对话框
const membersDialogVisible = ref(false)
const membersDialogTitle = ref("")
const membersLoading = ref(false)
const membersList = ref<GroupMember[]>([])

async function handleGroupNameClick(row: OrganizationModel) {
  membersDialogTitle.value = row.name
  membersDialogVisible.value = true
  membersLoading.value = true
  membersList.value = []
  try {
    const res = await getMemberGroupMembersApi("org", row.id, { page: 1, pageSize: 20 })
    if (res.code === 0) {
      membersList.value = res.data.members
    }
  } finally {
    membersLoading.value = false
  }
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
        <el-form-item prop="name" label="小组名称">
          <el-input v-model="searchFormData.name" placeholder="小组名称" clearable style="width: 200px" />
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
          <el-table-column prop="name" label="小组名称">
            <template #default="scope">
              <el-link type="primary" @click="handleGroupNameClick(scope.row)">
                {{ scope.row.name }}
              </el-link>
            </template>
          </el-table-column>
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
    <!-- 小组成员弹窗 -->
    <el-dialog v-model="membersDialogVisible" width="400px">
      <template #header>
        <div style="display: flex; align-items: center; gap: 8px">
          <span style="font-size: 16px; font-weight: 600; color: #303133">{{ membersDialogTitle }}</span>
          <el-tag type="danger" size="small" style="border-radius: 4px; font-weight: 500">成员</el-tag>
        </div>
      </template>
      <div v-loading="membersLoading" style="min-height: 60px">
        <template v-if="!membersLoading && membersList.length === 0">
          <el-empty description="暂无成员" :image-size="60" />
        </template>
        <template v-else>
          <div
            v-for="(member, index) in membersList"
            :key="member.id"
          >
            <div style="padding: 12px 0">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px">
                <span style="font-size: 15px; font-weight: 500; color: #1a1a1a">{{ member.nickname }}</span>
                <el-tag v-if="member.isOrgLeader" type="success" size="small" style="border-radius: 4px">组长</el-tag>
                <el-tag
                  v-for="label in member.userTypeLabels"
                  :key="label"
                  size="small"
                  :style="{
                    borderRadius: '4px',
                    color: getUserTypeLabelStyle(label).color,
                    background: getUserTypeLabelStyle(label).background,
                    borderColor: getUserTypeLabelStyle(label).border,
                  }"
                >{{ label }}</el-tag>
              </div>
              <div style="font-size: 13px; color: #999">{{ member.email }}</div>
            </div>
            <el-divider v-if="index < membersList.length - 1" style="margin: 0" />
          </div>
        </template>
      </div>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="title" :before-close="handleClose" width="30%">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="right"
        style="width: 95%; margin-top: 15px"
      >
        <el-form-item label="小组名称" prop="name">
          <el-input
            v-model="formData.name"
            autocomplete="off"
            placeholder="请输入小组名称"
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
