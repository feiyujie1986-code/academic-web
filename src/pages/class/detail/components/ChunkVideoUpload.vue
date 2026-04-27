<script lang="ts" setup>
import type { fileMeta } from "@/api/course/lesson"
import type { UploadStatus } from "@/composables/useCloudUpload"
import { computed, ref, watch } from "vue"
import { useCloudUpload } from "@/composables/useCloudUpload"
import DocumentPickerModal from "./DocumentPickerModal.vue"

const props = defineProps<{
  modelValue: fileMeta
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: fileMeta): void
  (e: "success", value: fileMeta): void
  (e: "remove"): void
}>()

// 文件输入引用
const fileInputRef = ref<HTMLInputElement | null>(null)

// 保存当前文件引用，用于暂停后继续上传
const currentFile = ref<File | null>(null)

// 云存储直传
const {
  status,
  progress,
  upload,
  pause,
  resume,
  cancel,
  reset
} = useCloudUpload({
  onSuccess: (result) => {
    const fileMeta: fileMeta = {
      filename: result.filename,
      size: result.size,
      fullpath: result.fullpath,
      md5: result.md5
    }
    emit("update:modelValue", fileMeta)
    emit("success", fileMeta)
  }
})

// 状态文本（useCloudUpload 不提供，需要自己实现）
const statusText = computed(() => {
  switch (status.value) {
    case "idle": return ""
    case "hashing": return "计算文件指纹中..."
    case "initializing": return "初始化上传中..."
    case "uploading": return `上传中 ${progress.value}%`
    case "paused": return `已暂停 ${progress.value}%`
    case "completing": return "完成中..."
    case "completed": return "上传完成"
    case "error": return "上传失败"
    case "cancelled": return "已取消"
    default: return ""
  }
})

// 当前选择的文件名
const currentFileName = ref("")

// 是否有已上传的文件
const hasUploadedFile = computed(() => {
  return props.modelValue && props.modelValue.filename !== ""
})

// 是否正在上传中
const isUploading = computed(() => {
  return ["hashing", "initializing", "uploading", "completing"].includes(status.value)
})

// 是否已暂停
const isPaused = computed(() => {
  return status.value === "paused"
})

// 是否上传完成
const isSuccess = computed(() => {
  return status.value === "completed"
})

// 是否上传失败
const isError = computed(() => {
  return status.value === "error"
})

// 是否显示文件项（有文件或正在上传）
const showFileItem = computed(() => {
  return hasUploadedFile.value || currentFileName.value !== ""
})

// 显示的文件名
const displayFileName = computed(() => {
  if (hasUploadedFile.value) {
    return props.modelValue.filename
  }
  return currentFileName.value
})

// 状态图标
const statusIcon = computed(() => {
  switch (status.value) {
    case "hashing":
    case "initializing":
    case "completing":
      return "Loading"
    case "uploading":
      return ""
    case "paused":
      return "VideoPause"
    case "completed":
      return "CircleCheck"
    case "error":
    case "cancelled":
      return "CircleClose"
    default:
      return hasUploadedFile.value ? "CircleCheck" : ""
  }
})

// 状态颜色
const statusColor = computed(() => {
  switch (status.value) {
    case "completed":
      return "var(--el-color-success)"
    case "error":
    case "cancelled":
      return "var(--el-color-danger)"
    case "paused":
      return "var(--el-color-warning)"
    default:
      return "var(--el-text-color-secondary)"
  }
})

// 进度条状态
const progressStatus = computed(() => {
  if (isSuccess.value || (hasUploadedFile.value && status.value === "idle")) {
    return "success"
  }
  if (isError.value) {
    return "exception"
  }
  return undefined
})

// 显示的进度值
const displayProgress = computed(() => {
  if (hasUploadedFile.value && status.value === "idle") {
    return 100
  }
  return progress.value
})

// 选择文件
function handleSelectFile() {
  fileInputRef.value?.click()
}

// 允许的视频扩展名
const allowedVideoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".mpeg", ".mpg", ".3gp"]

// 文件选择变化
async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  // 验证文件类型（通过扩展名或MIME类型）
  const fileName = file.name.toLowerCase()
  const hasValidExtension = allowedVideoExtensions.some(ext => fileName.endsWith(ext))
  const hasValidMimeType = file.type.startsWith("video/")

  if (!hasValidExtension && !hasValidMimeType) {
    ElMessage.error("请选择视频文件")
    return
  }

  currentFileName.value = file.name
  currentFile.value = file
  await upload(file)

  // 清空input，允许重复选择同一文件
  input.value = ""
}

// 暂停/继续
async function handlePauseResume() {
  if (isPaused.value) {
    if (currentFile.value) {
      await resume(currentFile.value)
    }
  } else if (isUploading.value) {
    pause()
  }
}

// 取消上传
async function handleCancel() {
  await cancel()
  currentFileName.value = ""
  currentFile.value = null
}

// 移除文件
function handleRemove() {
  reset()
  currentFileName.value = ""
  currentFile.value = null
  emit("update:modelValue", { filename: "", size: 0, fullpath: "", md5: "" })
  emit("remove")
}

// ── 资料中心选取 ──
const pickerVisible = ref(false)
const videoExtensions = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "mpeg", "mpg", "3gp"]

function openPicker() {
  pickerVisible.value = true
}

function onPickerConfirm(files: fileMeta[]) {
  if (!files.length) return
  const file = files[0]
  reset()
  currentFileName.value = ""
  currentFile.value = null
  emit("update:modelValue", file)
}

// 监听外部值变化（编辑模式或重置）
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && newVal.filename && status.value === "idle") {
      // 外部设置了文件，可能是编辑模式
      currentFileName.value = ""
    } else if (!newVal || newVal.filename === "") {
      // 外部重置了文件（表单提交后清空），重置内部状态
      reset()
      currentFileName.value = ""
      currentFile.value = null
    }
  },
  { immediate: true }
)

// 获取状态文本（用于显示）
function getDisplayStatusText(currentStatus: UploadStatus): string {
  if (hasUploadedFile.value && currentStatus === "idle") {
    return "上传完成"
  }
  return statusText.value
}
</script>

<template>
  <div class="chunk-video-upload">
    <!-- 上传按钮 -->
    <div v-if="!showFileItem" class="upload-trigger">
      <el-button @click="handleSelectFile">
        <el-icon><Upload /></el-icon>
        上传视频
      </el-button>
      <el-button @click="openPicker">
        <el-icon><FolderOpened /></el-icon>
        从资料中心获取
      </el-button>
      <input
        ref="fileInputRef"
        type="file"
        style="display: none"
        @change="handleFileChange"
      >
    </div>

    <!-- 文件项 -->
    <div v-else class="upload-file-item">
      <div class="file-info">
        <el-icon class="file-icon">
          <VideoCamera />
        </el-icon>
        <span class="file-name" :title="displayFileName">{{ displayFileName }}</span>

        <!-- 操作按钮 -->
        <div class="file-actions">
          <!-- 暂停/继续按钮 -->
          <el-icon
            v-if="isUploading || isPaused"
            class="action-icon"
            @click="handlePauseResume"
          >
            <VideoPlay v-if="isPaused" />
            <VideoPause v-else />
          </el-icon>

          <!-- 取消按钮（上传中） -->
          <el-icon
            v-if="isUploading || isPaused"
            class="action-icon action-close"
            @click="handleCancel"
          >
            <Close />
          </el-icon>

          <!-- 删除按钮（已完成） -->
          <el-icon
            v-if="!isUploading && !isPaused"
            class="action-icon action-close"
            @click="handleRemove"
          >
            <Close />
          </el-icon>
        </div>
      </div>

      <!-- 进度条 -->
      <div v-if="isUploading || isPaused || isSuccess || isError || hasUploadedFile" class="file-progress">
        <el-progress
          :percentage="displayProgress"
          :status="progressStatus"
          :stroke-width="4"
          :show-text="false"
        />
      </div>

      <!-- 状态文本 -->
      <div class="file-status" :style="{ color: statusColor }">
        <el-icon v-if="statusIcon" class="status-icon" :class="{ 'is-loading': statusIcon === 'Loading' }">
          <component :is="statusIcon" />
        </el-icon>
        <span>{{ getDisplayStatusText(status) }}</span>
      </div>
    </div>

    <!-- 资料中心选取弹窗 -->
    <DocumentPickerModal
      v-model:visible="pickerVisible"
      :exclude-fullpaths="[]"
      :limit="1"
      :allowed-extensions="videoExtensions"
      @confirm="onPickerConfirm"
    />
  </div>
</template>

<style scoped lang="scss">
.chunk-video-upload {
  width: 100%;
}

.upload-trigger {
  display: flex;
  gap: 8px;
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
    font-size: 20px;
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
    transition: color 0.2s;

    &:hover {
      color: var(--el-color-primary);
    }

    &.action-close:hover {
      color: var(--el-color-danger);
    }
  }

  .file-progress {
    margin-top: 8px;
  }

  .file-status {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    font-size: 12px;

    .status-icon {
      font-size: 14px;

      &.is-loading {
        animation: rotating 2s linear infinite;
      }
    }
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
