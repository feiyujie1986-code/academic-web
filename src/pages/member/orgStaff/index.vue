<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { OrgStaffModel } from "@/api/member/orgStaff"
import type { OrganizationModel } from "@/api/organization/organization"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { useValidateEmail } from "@@/utils/useValidate"
import { onMounted, reactive, ref } from "vue"
import {
  addOrgStaffApi,
  deleteOrgStaffApi,
  editOrgStaffApi,
  getOrgStaffsApi,
  resetOrgStaffPassApi,
  switchOrgStaffActiveApi
} from "@/api/member/orgStaff"
import { getOrganizationsApi } from "@/api/organization/organization"

defineOptions({
  name: "OrgStaff"
})

const loading = ref<boolean>(false)
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

// 机构列表
const organizationList = ref<OrganizationModel[]>([])

async function getOrganizationList() {
  try {
    const res = await getOrganizationsApi({ page: 1, pageSize: 10000 })
    if (res.code === 0) {
      organizationList.value = res.data.list
    }
  } catch (error) {
    console.log(error)
  }
}

onMounted(() => {
  getOrganizationList()
})

const searchFormData = reactive({
  email: "",
  nickname: "",
  organizationId: undefined as number | undefined
})

function handleSearch() {
  paginationData.currentPage = 1
  paginationData.pageSize = 10
  getTableData()
}

function resetSearch() {
  searchFormData.email = ""
  searchFormData.nickname = ""
  searchFormData.organizationId = undefined
}

const tableData = ref<OrgStaffModel[]>([])
let activeRow: OrgStaffModel

async function getTableData() {
  loading.value = true
  try {
    const res = await getOrgStaffsApi({
      email: searchFormData.email || undefined,
      nickname: searchFormData.nickname || undefined,
      organizationId: searchFormData.organizationId,
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    })
    if (res.code === 0) {
      // 将list数据转为时间格式
      tableData.value = res.data.list.map((item) => {
        item.createdDate = formatDateTime(item.createdAt * 1000, "YYYY-MM-DD")
        if (item.lastLogin > 0) item.lastLoginDate = formatDateTime(item.lastLogin * 1000)
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

// 修改密码对话框
const mpDialogVisible = ref<boolean>(false)

const mpFormRef = ref<FormInstance>()

const mpFormData = reactive({
  oldPassword: "",
  newPassword: "",
  rePassword: ""
})

function mpInitForm() {
  mpFormData.oldPassword = ""
  mpFormData.newPassword = ""
  mpFormData.rePassword = ""
}

function mpHandleClose(done: () => void) {
  mpInitForm()
  done()
}

function equalToPassword(rule: any, value: any, callback: any) {
  if (mpFormData.newPassword !== value) {
    callback(new Error("两次输入的密码不一致"))
  } else {
    callback()
  }
}

const mpFormRules: FormRules = reactive({
  oldPassword: [{ required: true, trigger: "blur", message: "旧密码不能为空" }],
  newPassword: [
    { required: true, trigger: "blur", message: "新密码不能为空" },
    { min: 6, max: 20, message: "长度在 6 到 20 个字符", trigger: "blur" }
  ],
  rePassword: [
    { required: true, trigger: "blur", message: "确认密码不能为空" },
    { required: true, validator: equalToPassword, trigger: "blur" }
  ]
})

function mpCloseDialog() {
  mpFormRef.value?.resetFields()
  mpInitForm()
  mpDialogVisible.value = false
}

function _modifyDialog(row: OrgStaffModel) {
  activeRow = row
  mpDialogVisible.value = true
}

function mpOperateAction(formEl: FormInstance | undefined) {
  if (!formEl) return
  formEl.validate(async (valid) => {
    if (valid) {
      await resetOrgStaffPassApi({
        id: activeRow.id,
        password: mpFormData.newPassword
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            mpCloseDialog()
          }
        })
        .catch(() => {})
    }
  })
}

// 添加、编辑用户对话框

function initForm() {
  formRef.value?.resetFields()
  formData.nickname = ""
  formData.password = ""
  formData.email = ""
  formData.active = true
  formData.gender = 1
  formData.remark = ""
  formData.organizationId = undefined
  formData.location = ""
}

const dialogVisible = ref<boolean>(false)
function handleClose(done: () => void) {
  initForm()
  done()
}

const formRef = ref<FormInstance>()
const formData = reactive({
  nickname: "",
  password: "",
  email: "",
  active: true,
  gender: 1,
  remark: "",
  organizationId: undefined as number | undefined,
  location: ""
})

// 密码规则验证状态
const passwordFocused = ref(false)
const passwordRules = computed(() => [
  { label: "8-20个字符", valid: formData.password.length >= 8 && formData.password.length <= 20 },
  { label: "包含数字", valid: /\d/.test(formData.password) },
  { label: "包含字母", valid: /[a-z]/i.test(formData.password) },
  { label: "包含特殊字符 (!@#$%^&*等)", valid: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) }
])

function validatePassword(_rule: any, value: any, callback: any) {
  if (!value) {
    callback()
    return
  }
  if (!/\d/.test(value)) {
    callback(new Error("密码必须包含数字"))
    return
  }
  if (!/[a-z]/i.test(value)) {
    callback(new Error("密码必须包含字母"))
    return
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    callback(new Error("密码必须包含特殊字符"))
    return
  }
  callback()
}

const formRules: FormRules = reactive({
  nickname: [{ trigger: "blur" }],
  password: [
    { required: true, trigger: "blur", message: "请填写密码" },
    { min: 8, max: 20, message: "密码长度应为 8 到 20 个字符", trigger: "blur" },
    { validator: validatePassword, trigger: "blur" }
  ],
  email: [
    { required: true, message: "请填写邮箱", trigger: "blur" },
    { validator: useValidateEmail, trigger: "blur" }
  ],
  organizationId: [{ required: true, trigger: "change", message: "请选择机构" }]
})
const kind = ref("")
const title = ref("")
const submitting = ref(false)
function addDialog() {
  initForm()
  kind.value = "Add"
  title.value = "新增合作机构负责同工"
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
          const res = await addOrgStaffApi({
            nickname: formData.nickname,
            password: formData.password,
            remark: formData.remark,
            email: formData.email,
            gender: formData.gender,
            active: formData.active,
            organizationId: formData.organizationId!,
            location: formData.location
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            getTableData()
          }
        } else if (kind.value === "Edit") {
          const res = await editOrgStaffApi({
            id: activeRow.id,
            nickname: formData.nickname,
            remark: formData.remark,
            email: formData.email,
            active: formData.active,
            gender: formData.gender,
            organizationId: formData.organizationId!,
            location: formData.location
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            getTableData()
          }
        }
        closeDialog()
      } finally {
        submitting.value = false
      }
    }
  })
}

function deleteAction(row: OrgStaffModel) {
  ElMessageBox.confirm("此操作将永久删除该用户, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      const index = tableData.value.indexOf(row)
      deleteOrgStaffApi({ id: row.id }).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          tableData.value.splice(index, 1)
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

function editDialog(row: OrgStaffModel) {
  activeRow = row
  formData.nickname = row.nickname || ""
  formData.remark = row.remark || ""
  formData.email = row.email
  formData.active = row.active ?? true
  formData.gender = row.gender ?? 1
  formData.organizationId = row.organizationId
  formData.location = row.location || ""
  kind.value = "Edit"
  title.value = "编辑合作机构负责同工"
  dialogVisible.value = true
}

// 切换用户状态
function switchAction(id: number, active: boolean) {
  switchOrgStaffActiveApi({ id, active })
    .then((res) => {
      if (res.code === 0) {
        if (active) {
          ElMessage({ type: "success", message: "启用成功" })
        } else {
          ElMessage({ type: "success", message: "禁用成功" })
        }
      } else {
        // API 返回失败，回滚状态
        const row = tableData.value.find(item => item.id === id)
        if (row) row.active = !active
      }
    })
    .catch(() => {
      // 网络错误，回滚状态
      const row = tableData.value.find(item => item.id === id)
      if (row) row.active = !active
    })
}
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" class="search-wrapper">
      <el-form :inline="true" :model="searchFormData">
        <el-form-item prop="nickname" label="姓名">
          <el-input v-model="searchFormData.nickname" placeholder="姓名" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item prop="email" label="邮箱">
          <el-input v-model="searchFormData.email" placeholder="邮箱" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item prop="organizationId" label="机构">
          <el-select
            v-model="searchFormData.organizationId"
            placeholder="请选择机构"
            clearable
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="item in organizationList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
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
          <el-table-column prop="nickname" label="姓名" width="110" />
          <el-table-column prop="email" label="邮箱" width="180" show-overflow-tooltip />
          <el-table-column prop="organizationName" label="机构" width="200" show-overflow-tooltip />
          <el-table-column prop="location" label="所在地" width="150" show-overflow-tooltip />
          <el-table-column prop="createdDate" label="创建日期" width="110" />
          <el-table-column prop="lastLoginDate" label="最近登录时间" width="180" show-overflow-tooltip />
          <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          <el-table-column prop="active" label="状态" width="80">
            <template #default="scope">
              <el-switch
                v-model="scope.row.active"
                inline-prompt
                :active-value="true"
                :inactive-value="false"
                active-text="启用"
                inactive-text="禁用"
                @change="switchAction(scope.row.id, scope.row.active)"
              />
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" align="center" width="180">
            <template #default="scope">
              <el-button type="primary" text icon="Edit" size="small" @click="editDialog(scope.row)">
                编辑
              </el-button>
              <el-button
                type="danger"
                text
                icon="Delete"
                size="small"
                @click="deleteAction(scope.row)"
              >
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
        <!-- 欺骗浏览器密码管理器 -->
        <input type="text" style="display: none" autocomplete="username">
        <input type="password" style="display: none" autocomplete="new-password">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" autocomplete="off" :disabled="kind === 'Edit'" />
        </el-form-item>
        <el-form-item v-if="kind === 'Add'" label="密码" prop="password">
          <el-input
            v-model="formData.password"
            autocomplete="new-password"
            type="password"
            show-password
            @focus="passwordFocused = true"
            @blur="passwordFocused = false"
          />
          <div v-if="passwordFocused" class="password-rules">
            <div
              v-for="(rule, index) in passwordRules"
              :key="index"
              class="password-rule-item"
              :class="{ valid: rule.valid }"
            >
              <el-icon><Select v-if="rule.valid" /><Close v-else /></el-icon>
              <span>{{ rule.label }}</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="姓名" prop="nickname">
          <el-input v-model="formData.nickname" autocomplete="off" />
        </el-form-item>
        <el-form-item label="机构" prop="organizationId" required>
          <el-select
            v-model="formData.organizationId"
            placeholder="请选择机构，也可输入名称快速查找"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in organizationList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="formData.gender">
            <el-radio :value="1" class="radio-item">
              男
            </el-radio>
            <el-radio :value="2" class="radio-item">
              女
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="所在地" prop="location">
          <el-input v-model="formData.location" type="textarea" :rows="3" placeholder="请输入所在地" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="状态" prop="active">
          <el-switch v-model="formData.active" active-text="启用" inactive-text="禁用" />
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
    <el-dialog v-model="mpDialogVisible" title="修改密码" :before-close="mpHandleClose" width="25%">
      <el-form
        ref="mpFormRef"
        :model="mpFormData"
        :rules="mpFormRules"
        label-width="100px"
        label-position="right"
        style="width: 95%; margin-top: 15px"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="mpFormData.oldPassword" autocomplete="off" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="mpFormData.newPassword" autocomplete="off" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="rePassword">
          <el-input v-model="mpFormData.rePassword" autocomplete="off" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="mpCloseDialog">
            取消
          </el-button>
          <el-button type="primary" @click="mpOperateAction(mpFormRef)">
            确认
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.password-rules {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
}

.password-rule-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  color: #909399;
}

.password-rule-item.valid {
  color: #67c23a;
}

.password-rule-item .el-icon {
  font-size: 14px;
}

.last-login-time,
.text-ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
</style>
