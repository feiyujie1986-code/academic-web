<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { UploadStatus } from "@/composables/useCloudUpload"
import {
  APP_PACKAGE_MAX_SIZE,
  AppPackagePlatform,
  createAppPackageApi,
  initAppPackageUploadApi,
  platformExtMap,
  platformLabelMap
} from "@/api/apppkg/apppkg"
import { useCloudUpload } from "@/composables/useCloudUpload"

interface Emits {
  (e: "update:visible", value: boolean): void
  (e: "success"): void
}

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
})

const platformOptions = Object.entries(platformLabelMap).map(([value, label]) => ({
  value: Number(value) as AppPackagePlatform,
  label
}))

// ========== 表单数据 ==========
const formRef = ref<FormInstance>()

function createDefaultFormData() {
  return {
    platform: AppPackagePlatform.Android,
    versionName: "",
    versionCode: undefined as number | undefined,
    changeLog: "",
    scope: ""
  }
}

const formData = ref(createDefaultFormData())

const formRules: FormRules = {
  platform: [{ required: true, message: "请选择平台", trigger: "change" }],
  versionName: [{ required: true, message: "请输入版本号", trigger: "blur" }]
}

const acceptExt = computed(() => platformExtMap[formData.value.platform])

// ========== 文件上传 ==========
const fileInputRef = ref<HTMLInputElement | null>(null)
const currentFile = ref<File | null>(null)
const currentFileName = ref("")
const uploadedFileId = ref<number | null>(null)

const {
  status: uploadStatus,
  progress: uploadProgress,
  upload: startUpload,
  pause: pauseUpload,
  resume: resumeUpload,
  cancel: cancelUpload,
  reset: resetUpload
} = useCloudUpload({
  multipartInitFn: data => initAppPackageUploadApi({ ...data, platform: formData.value.platform }),
  onSuccess: (result) => {
    uploadedFileId.value = result.id
  }
})

const isUploading = computed(() => ["hashing", "initializing", "uploading", "completing"].includes(uploadStatus.value))
const isPaused = computed(() => uploadStatus.value === "paused")
const isSuccess = computed(() => uploadStatus.value === "completed")
const isError = computed(() => uploadStatus.value === "error")
const showFileItem = computed(() => currentFileName.value !== "")

const statusText = computed(() => {
  switch (uploadStatus.value as UploadStatus) {
    case "hashing": return "计算文件指纹中..."
    case "initializing": return "初始化上传中..."
    case "uploading": return `上传中 ${uploadProgress.value}%`
    case "paused": return `已暂停 ${uploadProgress.value}%`
    case "completing": return "完成中..."
    case "completed": return "上传完成"
    case "error": return "上传失败，可重新选择文件重试"
    case "cancelled": return "已取消"
    default: return ""
  }
})

function resetFileState() {
  resetUpload()
  currentFile.value = null
  currentFileName.value = ""
  uploadedFileId.value = null
}

function handleSelectFile() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file) return

  const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`
  if (ext !== acceptExt.value) {
    ElMessage.error(`当前平台仅支持 ${acceptExt.value} 格式的安装包`)
    return
  }
  if (file.size > APP_PACKAGE_MAX_SIZE) {
    ElMessage.error("文件大小超过限制（500MB）")
    return
  }

  resetFileState()
  currentFileName.value = file.name
  currentFile.value = file
  await startUpload(file)
}

async function handlePauseResume() {
  if (isPaused.value) {
    if (currentFile.value) await resumeUpload(currentFile.value)
  } else if (isUploading.value) {
    pauseUpload()
  }
}

async function handleCancelFile() {
  await cancelUpload()
  resetFileState()
}

// 切换平台时清空已选文件（扩展名要求变了，旧文件不再适用）
watch(() => formData.value.platform, () => {
  resetFileState()
})

// ========== 弹窗打开/关闭 ==========
function resetForm() {
  formData.value = createDefaultFormData()
  formRef.value?.clearValidate()
  resetFileState()
}

watch(() => props.visible, (visible) => {
  if (visible) resetForm()
})

async function handleClose() {
  if (isUploading.value) {
    try {
      await ElMessageBox.confirm("文件正在上传，关闭将取消本次上传，确认关闭？", "确认关闭", {
        confirmButtonText: "确认关闭",
        cancelButtonText: "继续上传",
        type: "warning"
      })
    } catch {
      return
    }
    await cancelUpload()
  }
  dialogVisible.value = false
  resetForm()
}

// ========== 提交 ==========
const submitLoading = ref(false)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (!uploadedFileId.value) {
      ElMessage.warning("请先上传安装包文件")
      return
    }

    submitLoading.value = true
    try {
      const res = await createAppPackageApi({
        platform: formData.value.platform,
        versionName: formData.value.versionName,
        versionCode: formData.value.versionCode,
        changeLog: formData.value.changeLog || undefined,
        fileId: uploadedFileId.value,
        scope: formData.value.scope || undefined
      })
      if (res.code === 0) {
        ElMessage.success("上传成功")
        dialogVisible.value = false
        resetForm()
        emit("success")
      }
    } catch (error) {
      console.error(error)
    } finally {
      submitLoading.value = false
    }
  })
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="上传安装包"
    width="600px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      v-loading="submitLoading"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-form-item label="平台" prop="platform">
        <el-radio-group v-model="formData.platform">
          <el-radio v-for="item in platformOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="版本号" prop="versionName">
        <el-input v-model="formData.versionName" placeholder="如 1.2.3" clearable style="width: 260px" />
      </el-form-item>

      <el-form-item label="内部构建号" prop="versionCode">
        <el-input-number v-model="formData.versionCode" :min="0" controls-position="right" placeholder="选填" />
      </el-form-item>

      <el-form-item label="更新说明" prop="changeLog">
        <el-input v-model="formData.changeLog" type="textarea" :rows="3" placeholder="选填" maxlength="500" show-word-limit />
      </el-form-item>

      <el-form-item label="分发范围" prop="scope">
        <el-input v-model="formData.scope" placeholder="选填，如“内测”“生产”" clearable style="width: 260px" />
      </el-form-item>

      <el-form-item label="安装包" required>
        <div class="upload-wrapper">
          <div v-if="!showFileItem" class="upload-trigger">
            <el-button @click="handleSelectFile">
              <el-icon><Upload /></el-icon>
              选择{{ acceptExt }}文件
            </el-button>
            <input
              ref="fileInputRef"
              type="file"
              :accept="acceptExt"
              style="display: none"
              @change="handleFileChange"
            >
          </div>

          <div v-else class="upload-file-item">
            <div class="file-info">
              <el-icon class="file-icon">
                <Document />
              </el-icon>
              <span class="file-name" :title="currentFileName">{{ currentFileName }}</span>
              <div class="file-actions">
                <el-icon
                  v-if="isUploading || isPaused"
                  class="action-icon"
                  @click="handlePauseResume"
                >
                  <VideoPlay v-if="isPaused" />
                  <VideoPause v-else />
                </el-icon>
                <el-icon class="action-icon action-close" @click="handleCancelFile">
                  <Close />
                </el-icon>
              </div>
            </div>
            <el-progress
              :percentage="uploadProgress"
              :status="isSuccess ? 'success' : (isError ? 'exception' : undefined)"
              :stroke-width="4"
              :show-text="false"
            />
            <div class="file-status">
              {{ statusText }}
            </div>
          </div>
          <div class="upload-tip">
            单包大小上限 500MB，仅支持 {{ acceptExt }} 格式
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          取消
        </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.upload-wrapper {
  width: 100%;
}

.upload-trigger {
  display: flex;
  align-items: center;
}

.upload-file-item {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-fill-color-blank);

  .file-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .file-icon {
    font-size: 18px;
    color: var(--el-color-primary);
    flex-shrink: 0;
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  .file-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .action-icon {
    font-size: 16px;
    color: var(--el-text-color-secondary);
    cursor: pointer;

    &:hover {
      color: var(--el-color-primary);
    }

    &.action-close:hover {
      color: var(--el-color-danger);
    }
  }
}

.upload-tip,
.file-status {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 6px;
}
</style>
