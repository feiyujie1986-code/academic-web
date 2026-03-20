<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"

interface CategoryFormData {
  name: string
}

interface Props {
  visible: boolean
  formData: CategoryFormData
  formRules: FormRules
}

interface Emits {
  (e: "update:visible", value: boolean): void
  (e: "update:formData", value: CategoryFormData): void
  (e: "confirm", formEl: FormInstance | undefined): void
  (e: "close"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const categoryFormRef = ref<FormInstance>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
})

const localFormData = computed({
  get: () => props.formData,
  set: (value: CategoryFormData) => emit("update:formData", value)
})

function handleClose() {
  emit("close")
}

function handleConfirm() {
  emit("confirm", categoryFormRef.value)
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="添加分类"
    width="600px"
    :before-close="handleClose"
  >
    <el-form
      ref="categoryFormRef"
      :model="localFormData"
      :rules="formRules"
      label-width="80px"
      style="width: 95%; margin: 15px auto"
    >
      <el-form-item label="分类名称" prop="name">
        <el-input
          v-model="localFormData.name"
          placeholder="请输入分类名称"
          autocomplete="off"
          :maxlength="20"
          show-word-limit
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          取消
        </el-button>
        <el-button type="primary" @click="handleConfirm">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
