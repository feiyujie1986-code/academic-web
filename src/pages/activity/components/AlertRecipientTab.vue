<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { AlertRecipientItem } from "@/api/activity/alertRecipient"
import {
  createAlertRecipientApi,
  deleteAlertRecipientApi,
  editAlertRecipientApi,
  getAlertRecipientsApi
} from "@/api/activity/alertRecipient"

// ========== 列表数据 ==========
const loading = ref(false)
const tableData = ref<AlertRecipientItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getAlertRecipientsApi()
    if (res.code === 0) {
      tableData.value = res.data.list
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

getTableData()

// ========== 启用/禁用 ==========
const statusLoading = ref<number | null>(null)

async function handleEnabledToggle(row: AlertRecipientItem, value: string | number | boolean) {
  const previous = row.enabled
  const enabled = !!value
  row.enabled = enabled
  statusLoading.value = row.id
  try {
    const res = await editAlertRecipientApi(row.id, { enabled })
    if (res.code === 0) {
      ElMessage.success(enabled ? "已启用" : "已禁用")
    } else {
      row.enabled = previous
    }
  } catch (error) {
    console.error(error)
    row.enabled = previous
  } finally {
    statusLoading.value = null
  }
}

// ========== 新增/编辑 Dialog ==========
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const editData = ref<AlertRecipientItem | null>(null)
const isEdit = computed(() => !!editData.value)
const dialogTitle = computed(() => (isEdit.value ? "编辑收件人" : "新增收件人"))

function createDefaultFormData() {
  return { email: "", remark: "" }
}

const formData = ref(createDefaultFormData())

const formRules: FormRules = {
  email: [
    { required: true, message: "请输入收件邮箱", trigger: "blur" },
    { type: "email", message: "请输入合法的邮箱地址", trigger: "blur" }
  ]
}

function handleAdd() {
  editData.value = null
  formData.value = createDefaultFormData()
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

function handleEdit(row: AlertRecipientItem) {
  editData.value = row
  formData.value = { email: row.email, remark: row.remark || "" }
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

const submitLoading = ref(false)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      const res = isEdit.value
        ? await editAlertRecipientApi(editData.value!.id, { remark: formData.value.remark || undefined })
        : await createAlertRecipientApi({ email: formData.value.email, remark: formData.value.remark || undefined })
      if (res.code === 0) {
        ElMessage.success(isEdit.value ? "编辑成功" : "新增成功")
        dialogVisible.value = false
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

async function handleDelete(row: AlertRecipientItem) {
  try {
    await ElMessageBox.confirm(`确认删除收件人「${row.email}」？`, "确认删除", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })
    deleteLoading.value = row.id
    const res = await deleteAlertRecipientApi(row.id)
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
  <div>
    <div class="toolbar-wrapper">
      <el-button type="primary" icon="Plus" @click="handleAdd">
        新增收件人
      </el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" border>
      <el-table-column label="邮箱" min-width="200">
        <template #default="{ row }">
          {{ row.email }}
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="160">
        <template #default="{ row }">
          {{ row.remark || "-" }}
        </template>
      </el-table-column>
      <el-table-column label="启用" width="100" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.enabled"
            :loading="statusLoading === row.id"
            @change="(value) => handleEnabledToggle(row, value)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" align="center">
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

    <el-empty v-if="!loading && tableData.length === 0" description="暂无收件人" />

    <!-- 新增/编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="formRef" v-loading="submitLoading" :model="formData" :rules="formRules" label-width="80px">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入收件邮箱" :disabled="isEdit" clearable />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" placeholder="选填" maxlength="100" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.toolbar-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
</style>
