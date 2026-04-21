<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { teacherDataModel } from "@/api/member/teacher"
import type { OrganizationModel } from "@/api/organization/organization"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { useValidateEmail } from "@@/utils/useValidate"
import { onMounted, reactive, ref } from "vue"
import {
  addTeacherApi,
  deleteTeacherApi,
  editTeacherApi,
  getTeachersApi,
  resetPassApi,
  SwitchActiveApi
} from "@/api/member/teacher"
import { editOrganizationApi, getOrganizationsApi } from "@/api/organization/organization"

defineOptions({
  name: "Teacher"
})

const loading = ref<boolean>(false)
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

// 小组列表
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

const tableData = ref<teacherDataModel[]>([])
let activeRow: teacherDataModel

async function getTableData() {
  loading.value = true
  try {
    const res = await getTeachersApi({
      email: searchFormData.email || undefined,
      nickname: searchFormData.nickname || undefined,
      organizationId: searchFormData.organizationId,
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    })
    if (res.code === 0) {
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

// 重置密码
function resetPasswordAction(row: teacherDataModel) {
  ElMessageBox.confirm(`确定要重置「${row.nickname}」的密码吗？`, "重置密码", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      resetPassApi({ id: row.id }).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
        }
      })
    })
    .catch(() => {})
}

// 添加、编辑对话框

function initForm() {
  formRef.value?.resetFields()
  formData.username = ""
  formData.nickname = ""
  formData.password = ""
  formData.email = ""
  formData.active = true
  formData.gender = 1
  formData.remark = ""
  formData.organizationId = undefined
  isLeader.value = false
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
  remark: "",
  gender: 1,
  organizationId: undefined as number | undefined
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
    { min: 8, max: 20, message: "密码长度应为 8 到 20 个字符", trigger: "blur" },
    { validator: validatePassword, trigger: "blur" }
  ],
  email: [{ validator: useValidateEmail, trigger: "blur" }],
  organizationId: []
})

const kind = ref("")
const title = ref("")
const submitting = ref(false)

function addDialog() {
  initForm()
  kind.value = "Add"
  title.value = "新增教师"
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
          const res = await addTeacherApi({
            username: formData.username || undefined,
            nickname: formData.nickname,
            password: formData.password || undefined,
            remark: formData.remark,
            email: formData.email,
            active: formData.active,
            gender: formData.gender,
            organizationId: formData.organizationId
          })
          if (res.code === 0) {
            // 新建后设为组长
            const newUserId = res.data?.id
            if (isLeader.value && formData.organizationId && newUserId) {
              const org = organizationList.value.find(o => o.id === formData.organizationId)
              if (org) {
                const currentLeaderIds = (org.leaders ?? []).map(l => l.userId)
                if (currentLeaderIds.length < 2) {
                  await editOrganizationApi({
                    id: org.id,
                    name: org.name,
                    remark: org.remark,
                    leaderIds: [...currentLeaderIds, newUserId]
                  })
                  org.leaders = [...(org.leaders ?? []), { userId: newUserId, nickname: formData.nickname }]
                }
              }
            }
            ElMessage({ type: "success", message: res.msg })
            getTableData()
          }
        } else if (kind.value === "Edit") {
          const res = await editTeacherApi({
            id: activeRow.id,
            nickname: formData.nickname,
            remark: formData.remark,
            email: formData.email,
            active: formData.active,
            gender: formData.gender,
            organizationId: formData.organizationId
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

function deleteTeacherAction(row: teacherDataModel) {
  ElMessageBox.confirm("此操作将永久删除该用户, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      const index = tableData.value.indexOf(row)
      deleteTeacherApi({ id: row.id }).then((res) => {
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

function editDialog(row: teacherDataModel) {
  activeRow = row
  formData.username = row.username
  formData.nickname = row.nickname
  formData.remark = row.remark
  formData.email = row.email ?? ""
  formData.active = row.active
  formData.gender = row.gender
  formData.organizationId = row.organizationId
  kind.value = "Edit"
  title.value = "编辑教师"
  computeIsLeader()
  dialogVisible.value = true
}

// ===== 组长 =====

/** 核心：修改某小组的组长列表，返回是否成功 */
async function setLeaderForOrg(userId: number, nickname: string, orgId: number, val: boolean): Promise<boolean> {
  const org = organizationList.value.find(o => o.id === orgId)
  if (!org) return false

  const currentLeaderIds = (org.leaders ?? []).map(l => l.userId)
  let newLeaderIds: number[]
  if (val) {
    if (currentLeaderIds.length >= 2) {
      ElMessage.warning("该小组已有 2 位组长，无法继续设置")
      return false
    }
    newLeaderIds = [...currentLeaderIds, userId]
  } else {
    newLeaderIds = currentLeaderIds.filter(id => id !== userId)
  }

  const res = await editOrganizationApi({
    id: org.id,
    name: org.name,
    remark: org.remark,
    leaderIds: newLeaderIds
  })
  if (res.code === 0) {
    ElMessage.success(val ? "已设为组长" : "已取消组长")
    org.leaders = val
      ? [...(org.leaders ?? []), { userId, nickname }]
      : (org.leaders ?? []).filter(l => l.userId !== userId)
    return true
  }
  return false
}

// ----- 列表行组长 switch -----
function isUserLeader(row: teacherDataModel): boolean {
  if (!row.organizationId) return false
  const org = organizationList.value.find(o => o.id === row.organizationId)
  return org?.leaders?.some(l => l.userId === row.id) ?? false
}

const leaderLoadingIds = reactive(new Set<number>())

async function handleListLeaderChange(row: teacherDataModel, val: boolean) {
  if (!row.organizationId) {
    ElMessage.warning("该教师尚未分配小组，无法设为组长")
    return
  }
  leaderLoadingIds.add(row.id)
  try {
    await setLeaderForOrg(row.id, row.nickname, row.organizationId, val)
  } catch {
    ElMessage.error("操作失败")
  } finally {
    leaderLoadingIds.delete(row.id)
  }
}

// ----- 弹窗组长 switch -----
const isLeader = ref(false)
const isLeaderLoading = ref(false)

function computeIsLeader() {
  if (!activeRow || !formData.organizationId) {
    isLeader.value = false
    return
  }
  const org = organizationList.value.find(o => o.id === formData.organizationId)
  isLeader.value = org?.leaders?.some(l => l.userId === activeRow.id) ?? false
}

watch(() => formData.organizationId, () => {
  if (kind.value === "Edit") {
    computeIsLeader()
  } else {
    isLeader.value = false
  }
})

async function handleIsLeaderChange(val: boolean) {
  if (!formData.organizationId) {
    ElMessage.warning("请先选择小组，才能设为组长")
    isLeader.value = !val
    return
  }
  // 新增模式：仅记录标志，提交时统一处理
  if (kind.value === "Add") return

  isLeaderLoading.value = true
  try {
    const success = await setLeaderForOrg(activeRow.id, activeRow.nickname, formData.organizationId, val)
    if (!success) isLeader.value = !val
  } catch {
    isLeader.value = !val
  } finally {
    isLeaderLoading.value = false
  }
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
    <el-card shadow="never" class="search-wrapper">
      <el-form :inline="true" :model="searchFormData">
        <el-form-item prop="nickname" label="昵称">
          <el-input v-model="searchFormData.nickname" placeholder="昵称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item prop="email" label="邮箱">
          <el-input v-model="searchFormData.email" placeholder="邮箱" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item prop="organizationId" label="小组">
          <el-select
            v-model="searchFormData.organizationId"
            placeholder="请选择小组"
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
          <el-table-column prop="username" label="账号" width="130" show-overflow-tooltip />
          <el-table-column prop="nickname" label="昵称" width="110" />
          <el-table-column prop="email" label="邮箱" width="180" show-overflow-tooltip />
          <el-table-column prop="organizationName" label="小组" width="200" show-overflow-tooltip />
          <el-table-column label="设为组长" width="120">
            <template #default="scope">
              <el-switch
                :model-value="isUserLeader(scope.row)"
                :loading="leaderLoadingIds.has(scope.row.id)"
                :disabled="!scope.row.organizationId"
                active-text="是"
                inactive-text="否"
                @change="(val) => handleListLeaderChange(scope.row, val as boolean)"
              />
            </template>
          </el-table-column>
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
          <el-table-column fixed="right" label="操作" align="center" width="240">
            <template #default="scope">
              <div style="white-space: nowrap">
                <el-button type="primary" text icon="Edit" size="small" @click="editDialog(scope.row)">
                  编辑
                </el-button>
                <el-button type="primary" text icon="Key" size="small" @click="resetPasswordAction(scope.row)">
                  重置
                </el-button>
                <el-button
                  type="danger"
                  text
                  icon="Delete"
                  size="small"
                  @click="deleteTeacherAction(scope.row)"
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
      >
        <!-- 欺骗浏览器密码管理器 -->
        <input type="text" style="display: none" autocomplete="username">
        <input type="password" style="display: none" autocomplete="new-password">
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
            placeholder="如不填写，使用默认密码"
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
          <el-input v-model="formData.email" autocomplete="off" />
        </el-form-item>
        <el-form-item label="小组" prop="organizationId">
          <el-select
            v-model="formData.organizationId"
            placeholder="请选择小组，也可输入名称快速查找"
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
        <el-form-item label="设为组长">
          <el-switch
            v-model="isLeader"
            :loading="isLeaderLoading"
            active-text="是"
            inactive-text="否"
            @change="(val) => handleIsLeaderChange(val as boolean)"
          />
          <span class="form-tip">
            {{ kind === 'Edit' ? '切换立即生效，最多2位组长' : '新增后自动设置' }}
          </span>
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

.form-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}
</style>
