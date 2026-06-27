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
  resetPasswordApi,
  SwitchActiveApi
} from "@/api/authority/user"

defineOptions({
  name: "User"
})

const loading = ref<boolean>(false)
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

type userListDataModel = userDataModel
const tableData = ref<userListDataModel[]>([])
let activeRow: userListDataModel | undefined

async function getTableData() {
  loading.value = true
  try {
    const res = await getUsersApi({ page: paginationData.currentPage, pageSize: paginationData.pageSize })
    if (res.code === 0) {
      tableData.value = res.data.list
      paginationData.total = res.data.total
    }
  } catch (error) {
    console.log(error)
  }
  loading.value = false
}
getTableData()

// 添加、编辑账号对话框

function initForm() {
  formRef.value?.resetFields()
  formData.username = ""
  formData.nickname = ""
  formData.password = ""
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
  username: "",
  nickname: "",
  password: "",
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
  nickname: [{ required: true, trigger: "blur", message: "请填写昵称" }],
  password: [
    { required: true, trigger: "blur", message: "请填写密码" },
    { min: 8, max: 20, message: "密码长度应为 8 到 20 个字符", trigger: "blur" },
    { validator: validatePassword, trigger: "blur" }
  ],
  email: [
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
    if (valid) {
      submitting.value = true
      try {
        if (kind.value === "Add") {
          const res = await addUserApi({
            nickname: formData.nickname,
            username: formData.username || undefined,
            password: formData.password,
            email: formData.email || undefined,
            active: formData.active,
            gender: formData.gender,
            roleIds: formData.roleId ? [formData.roleId] : []
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            getTableData()
          }
        } else if (kind.value === "Edit" && activeRow) {
          const res = await editUserApi({
            id: activeRow.id,
            nickname: formData.nickname,
            email: formData.email || undefined,
            active: formData.active,
            gender: formData.gender,
            roleIds: formData.roleId ? [formData.roleId] : []
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            // 替换数据
            const index = tableData.value.indexOf(activeRow)
            tableData.value.splice(index, 1, res.data)
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
      if (["超级管理员", "牧长"].includes(element.roleName)) {
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
  formData.username = row.username
  formData.nickname = row.nickname
  formData.email = row.email ?? ""
  formData.active = row.active
  formData.gender = row.gender
  formData.roleId = row.roles.length > 0 ? row.roles[0].id : undefined
  kind.value = "Edit"
  title.value = "编辑账号"
  dialogVisible.value = true
}

// 重置密码
function resetPasswordAction(row: userListDataModel) {
  ElMessageBox.confirm(
    `确认将「${row.nickname}」的密码重置为初始密码？`,
    "重置密码",
    {
      confirmButtonText: "确认重置",
      cancelButtonText: "取消",
      type: "warning"
    }
  )
    .then(() => {
      resetPasswordApi({ id: row.id }).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: "密码已重置为初始密码" })
        }
      })
    })
    .catch(() => {})
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
          <el-table-column prop="username" label="账号" />
          <el-table-column prop="nickname" label="昵称" />
          <el-table-column prop="email" label="邮箱" />
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
          <el-table-column fixed="right" label="操作" align="center" width="240">
            <template #default="scope">
              <div style="white-space: nowrap">
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
                <el-button
                  type="warning"
                  text
                  icon="RefreshLeft"
                  size="small"
                  :disabled="scope.row.id === 1"
                  @click="resetPasswordAction(scope.row)"
                >
                  重置密码
                </el-button>
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
              </div>
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
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="formData.nickname" autocomplete="off" />
        </el-form-item>
        <el-form-item label="账号" prop="username">
          <el-input
            v-model="formData.username"
            autocomplete="off"
            :disabled="kind === 'Edit'"
            :placeholder="kind === 'Add' ? '如不填，默认通过昵称生成' : ''"
          />
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
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="formData.email"
            autocomplete="new-email"
            :disabled="kind === 'Edit' && !!activeRow?.email"
          />
        </el-form-item>
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
