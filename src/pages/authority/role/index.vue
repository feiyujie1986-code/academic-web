<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { roleDataModel } from "@/api/authority/role"
import { reactive, ref } from "vue"
import { addRoleApi, deleteRoleApi, editRoleApi, getRolesApi } from "@/api/authority/role"
import Apis from "./components/apis.vue"
import Menus from "./components/menus.vue"

defineOptions({
  name: "Role"
})

const loading = ref<boolean>(false)
const tableData = ref<roleDataModel[]>([])
let activeRow: roleDataModel

async function getTableData() {
  loading.value = true
  const res = await getRolesApi()
  if (res.code === 0) {
    // 按创建时间倒序排序，最新的排在前面
    tableData.value = res.data.sort((a, b) => b.createdAt - a.createdAt)
  }
  loading.value = false
}
getTableData()

function initForm() {
  formData.roleName = ""
  formData.identity = ""
}

const dialogVisible = ref<boolean>(false)
function handleClose(done: () => void) {
  initForm()
  done()
}

const formRef = ref<FormInstance>()
const formData = reactive({
  id: 0,
  roleName: "",
  identity: ""
})
const formRules: FormRules = reactive({
  roleName: [{ required: true, trigger: "blur", message: "请填写角色名称" }],
  identity: [{ required: true, trigger: "blur", message: "请填写角色标识" }]
})

const kind = ref("")
const title = ref("")
const submitting = ref(false)
function addDialog() {
  kind.value = "Add"
  title.value = "新增角色"
  dialogVisible.value = true
}

function editDialog(row: roleDataModel) {
  kind.value = "Edit"
  title.value = "编辑角色"
  activeRow = row
  formData.roleName = row.roleName
  formData.identity = row.identity
  dialogVisible.value = true
}

function closeDialog() {
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
          const res = await addRoleApi({
            roleName: formData.roleName,
            identity: formData.identity
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            // 新增的数据插入到列表开头
            tableData.value.unshift(res.data)
          }
        } else if (kind.value === "Edit") {
          const res = await editRoleApi({
            id: activeRow.id,
            roleName: formData.roleName,
            identity: formData.identity
          })
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
            const index = tableData.value.indexOf(activeRow)
            tableData.value[index].roleName = formData.roleName
          }
        }
        closeDialog()
      } finally {
        submitting.value = false
      }
    }
  })
}

function deleteRoleAction(row: roleDataModel) {
  ElMessageBox.confirm("此操作将永久删除该角色, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      const index = tableData.value.indexOf(row)
      deleteRoleApi({ id: row.id }).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          tableData.value.splice(index, 1)
        }
      })
    })
    .catch(() => {})
}

// 角色设置
const drawer = ref(false)
let activeId: number
let isSystem: boolean
function openDrawer(row: roleDataModel) {
  activeId = row.id
  isSystem = row.isSystem ?? false
  drawer.value = true
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
          <el-table-column prop="roleName" label="名称" />
          <el-table-column prop="identity" label="标识" />
          <el-table-column prop="isSystem" label="系统角色">
            <template #default="scope">
              <el-tag v-if="scope.row.isSystem" type="success">
                是
              </el-tag>
              <el-tag v-else>
                否
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" align="center" width="300">
            <template #default="scope">
              <el-button type="primary" text icon="Setting" size="small" @click="openDrawer(scope.row)">
                设置权限
              </el-button>
              <el-button type="primary" text icon="Edit" size="small" @click="editDialog(scope.row)">
                编辑
              </el-button>
              <el-button
                type="danger"
                text
                icon="Delete"
                size="small"
                @click="deleteRoleAction(scope.row)"
                :disabled="scope.row.isSystem"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
    <el-dialog v-model="dialogVisible" :title="title" :before-close="handleClose" width="30%">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="left"
        style="width: 95%; margin-top: 15px"
      >
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="formData.roleName" autocomplete="off" />
        </el-form-item>
        <el-form-item label="角色标识" prop="identity">
          <el-input :disabled="kind === 'Edit'" v-model="formData.identity" autocomplete="off" />
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
    <el-drawer v-if="drawer" v-model="drawer" :with-header="false" size="35%" title="角色配置">
      <el-tabs type="border-card">
        <el-tab-pane label="角色菜单">
          <Menus :id="activeId" :is-system="isSystem" />
        </el-tab-pane>
        <el-tab-pane label="角色接口">
          <Apis :id="activeId" :is-system="isSystem" />
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>
