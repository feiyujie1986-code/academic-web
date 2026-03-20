<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { userDataModel } from "@/api/authority/user"
import { usePagination } from "@@/composables/usePagination_n"
import { useValidateEmail } from "@@/utils/useValidate"
import { reactive, ref } from "vue"
import { getRolesApi } from "@/api/authority/role"
import {
  addUserApi,
  deleteUserApi,
  editUserApi,
  getUsersApi,
  modifyPassApi,
  SwitchActiveApi,
  SwitchSeniorTeacherApi
} from "@/api/authority/user"

defineOptions({
  name: "User"
})

const loading = ref<boolean>(false)
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

interface userListDataModel extends userDataModel {
  userTypeStatus: boolean
}
const tableData = ref<userListDataModel[]>([])
let activeRow: userListDataModel

async function getTableData() {
  loading.value = true
  try {
    const res = await getUsersApi({ page: paginationData.currentPage, pageSize: paginationData.pageSize })
    if (res.code === 0) {
      tableData.value = res.data.list.map(item => ({
        ...item,
        userTypeStatus: item.userType === 9
      }))
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

function equalToPassword(_rule: any, value: any, callback: any) {
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
const mpSubmitting = ref(false)

function mpCloseDialog() {
  mpFormRef.value?.resetFields()
  mpInitForm()
  mpDialogVisible.value = false
}

function _modifyDialog(row: userListDataModel) {
  activeRow = row
  mpDialogVisible.value = true
}

function mpOperateAction(formEl: FormInstance | undefined) {
  if (!formEl) return
  formEl.validate(async (valid) => {
    if (valid) {
      mpSubmitting.value = true
      try {
        const res = await modifyPassApi({
          id: activeRow.id,
          oldPassword: mpFormData.oldPassword,
          newPassword: mpFormData.newPassword
        })
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          mpCloseDialog()
        }
      } finally {
        mpSubmitting.value = false
      }
    }
  })
}

// 添加、编辑用户对话框

function initForm() {
  formRef.value?.resetFields()
  formData.nickname = ""
  formData.password = ""
  formData.phone = ""
  formData.email = ""
  formData.active = true
  formData.gender = 1
  formData.roleId = undefined
}

const dialogVisible = ref<boolean>(false)
function handleClose(done: () => void) {
  initForm()
  done()
}

const formRef = ref<FormInstance>()
const formData = reactive({
  // username: "",
  nickname: "",
  password: "",
  phone: "",
  email: "",
  active: true,
  gender: 1,
  roleId: undefined as number | undefined
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
  // phone: [{ validator: useValidatePhone, trigger: "blur" }],
  email: [
    { required: true, message: "请填写邮箱", trigger: "blur" },
    { validator: useValidateEmail, trigger: "blur" }
  ],
  roleId: [{ required: true, trigger: "change", message: "请选择角色" }]
})
const kind = ref("")
const title = ref("")
const submitting = ref(false)
function addDialog() {
  initForm()
  kind.value = "Add"
  title.value = "新增账号"
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
    // console.log(valid)
    if (valid) {
      submitting.value = true
      try {
        if (kind.value === "Add") {
          const res = await addUserApi({
            nickname: formData.nickname,
            password: formData.password,
            // phone: formData.phone,
            email: formData.email,
            active: formData.active,
            gender: formData.gender,
            roleIds: formData.roleId ? [formData.roleId] : []
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            getTableData()
          }
        } else if (kind.value === "Edit") {
          const res = await editUserApi({
            id: activeRow.id,
            nickname: formData.nickname,
            // phone: formData.phone,
            email: formData.email,
            active: formData.active,
            gender: formData.gender,
            roleIds: formData.roleId ? [formData.roleId] : []
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            // 替换数据
            const index = tableData.value.indexOf(activeRow)
            const userDataWithStatus = {
              ...res.data,
              userTypeStatus: res.data.userType === 9
            }
            tableData.value.splice(index, 1, userDataWithStatus)
          }
        }
        closeDialog()
      } finally {
        submitting.value = false
      }
    }
  })
}

function deleteUserAction(row: userListDataModel) {
  ElMessageBox.confirm("此操作将永久删除该用户, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      const index = tableData.value.indexOf(row)
      deleteUserApi({ id: row.id }).then((res) => {
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

interface option {
  ID: string
  roleName: string
}
const roleOptions: option[] = []
async function getRoleOption() {
  const res = await getRolesApi()
  if (res.code === 0) {
    res.data.forEach((element) => {
      // 将identity为teacher、student、senior_teacher的role不显示
      if (!["teacher", "student", "senior_teacher", "class_monitor", "org_staff", "backend_staff"].includes(element.identity)) {
        roleOptions.push({ ID: String(element.id), roleName: element.roleName })
      }
    })
  }
}
getRoleOption()

// 角色标签样式映射（浅色背景 + 彩色文字）
function getRoleTagStyle(roleName: string): Record<string, string> {
  const styleMap: Record<string, { bg: string, color: string }> = {
    超级管理员: { bg: "#EBFAEF", color: "#52C41A" },
    大使长: { bg: "#F5E8FF", color: "#9216FF" },
    大使: { bg: "#FFEFF0", color: "#E6A23C" },
    教师: { bg: "#E8F1FF", color: "#409EFF" },
    学员: { bg: "#FFF4EA", color: "#FF8D28" },
    机构人员: { bg: "#E6F9FB", color: "#00C3D0" },
    财务: { bg: "#F0EEFE", color: "#6155F5" },
    运营: { bg: "#F7F3EF", color: "#AC7F5E" }
  }
  const style = styleMap[roleName] || { bg: "#F0F0F0", color: "#666666" }
  return {
    backgroundColor: style.bg,
    color: style.color,
    borderColor: style.bg
  }
}

function editDialog(row: userListDataModel) {
  activeRow = row
  formData.nickname = row.nickname
  // formData.phone = row.phone
  formData.email = row.email
  formData.active = row.active
  formData.gender = row.gender
  formData.roleId = row.roles.length > 0 ? row.roles[0].id : undefined
  kind.value = "Edit"
  title.value = "编辑用户"
  dialogVisible.value = true
}

// 切换用户状态
function switchAction(id: number, active: boolean) {
  SwitchActiveApi({ id, active })
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
// 切换用户类型（设置大使）
function switchUserType(id: number, utype: number) {
  const status = utype !== 9
  SwitchSeniorTeacherApi({ id, status })
    .then((res) => {
      if (res.code === 0) {
        if (status) {
          ElMessage({ type: "success", message: "设置成功" })
          // 更新 userType
          const row = tableData.value.find(item => item.id === id)
          if (row) row.userType = 9
        } else {
          ElMessage({ type: "success", message: "取消成功" })
          const row = tableData.value.find(item => item.id === id)
          if (row) row.userType = 0
        }
      } else {
        // API 返回失败，回滚状态
        const row = tableData.value.find(item => item.id === id)
        if (row) row.userTypeStatus = !status
      }
    })
    .catch(() => {
      // 网络错误，回滚状态
      const row = tableData.value.find(item => item.id === id)
      if (row) row.userTypeStatus = !status
    })
}
</script>

<template>
  <div class="app-container">
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
          <el-table-column prop="id" label="ID" />
          <el-table-column prop="email" label="邮箱" />
          <el-table-column prop="nickname" label="姓名" />
          <!-- <el-table-column prop="phone" label="手机号" /> -->
          <el-table-column prop="roles" label="角色">
            <template #default="scope">
              <el-tag
                v-for="role in scope.row.roles"
                :key="role.id"
                :style="{ ...getRoleTagStyle(role.roleName), marginRight: '5px' }"
              >
                {{ role.roleName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="active" label="状态" width="160">
            <template #default="scope">
              <el-switch
                v-model="scope.row.active"
                inline-prompt
                :active-value="true"
                :inactive-value="false"
                active-text="启用"
                inactive-text="禁用"
                @change="switchAction(scope.row.id, scope.row.active)"
                :disabled="scope.row.id === 1"
              />
            </template>
          </el-table-column>
          <el-table-column prop="userTypeStatus" label="设置大使">
            <template #default="scope">
              <el-switch
                v-model="scope.row.userTypeStatus"
                inline-prompt
                :active-value="true"
                :inactive-value="false"
                active-text="已设置"
                inactive-text="未设置"
                @change="switchUserType(scope.row.id, scope.row.userType)"
              />
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" align="center" width="180">
            <template #default="scope">
              <el-button
                type="primary"
                text
                icon="Edit"
                size="small"
                :disabled="scope.row.id === 1"
                @click="editDialog(scope.row)"
              >
                编辑
              </el-button>
              <!-- <el-button type="primary" text icon="Key" size="small" @click="modifyDialog(scope.row)">
                修改密码
              </el-button> -->
              <el-button
                type="danger"
                text
                icon="Delete"
                size="small"
                :disabled="scope.row.id === 1"
                @click="deleteUserAction(scope.row)"
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
        autocomplete="off"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" autocomplete="new-email" :disabled="kind === 'Edit'" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="kind === 'Add'">
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
        <el-form-item label="用户名称" prop="nickname">
          <el-input v-model="formData.nickname" autocomplete="off" />
        </el-form-item>
        <!-- <el-form-item label="手机号码" prop="phone">
          <el-input v-model="formData.phone" autocomplete="off" />
        </el-form-item> -->
        <el-form-item label="状态" prop="active">
          <el-switch v-model="formData.active" active-text="启用" inactive-text="禁用" />
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
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="formData.roleId" placeholder="请选择角色">
            <el-option v-for="role in roleOptions" :key="role.ID" :label="role.roleName" :value="Number(role.ID)" />
          </el-select>
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
          <el-button type="primary" :loading="mpSubmitting" @click="mpOperateAction(mpFormRef)">
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
</style>
