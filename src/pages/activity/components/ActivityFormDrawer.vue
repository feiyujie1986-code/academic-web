<script lang="ts" setup>
import type { FormInstance, FormRules, UploadRequestOptions } from "element-plus"
import type { ActivityFormParams, ActivityListItem } from "@/api/activity/activity"
import type { ActivityCategoryItem } from "@/api/activity/category"
import { QuillEditor } from "@vueup/vue-quill"
import BlotFormatter from "quill-blot-formatter"
import { ActivityStatus, addActivityApi, editActivityApi, updateActivityStatusApi } from "@/api/activity/activity"
import { getAllCategoriesApi } from "@/api/activity/category"
import { uploadFile, uploadImage } from "@/api/fileM/file"
import "@vueup/vue-quill/dist/vue-quill.snow.css"

interface Props {
  visible: boolean
  editData: ActivityListItem | null
}

interface Emits {
  (e: "update:visible", value: boolean): void
  (e: "success"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const drawerVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
})

const isEdit = computed(() => !!props.editData)
const drawerTitle = computed(() => (isEdit.value ? "编辑活动" : "新增活动"))

// ========== 分类选项 ==========
const categoryOptions = ref<ActivityCategoryItem[]>([])

async function loadCategories() {
  try {
    const res = await getAllCategoriesApi()
    if (res.code === 0) {
      categoryOptions.value = res.data
    }
  } catch (error) {
    console.error(error)
  }
}

// ========== 表单数据 ==========
const formRef = ref<FormInstance>()

function createDefaultFormData() {
  return {
    title: "",
    categoryId: undefined as number | undefined,
    coverImage: "",
    location: "",
    startTime: undefined as number | undefined,
    endTime: undefined as number | undefined,
    description: "",
    maxParticipants: 0,
    sortOrder: 0
  }
}

const formData = ref(createDefaultFormData())

// ========== 富文本编辑器 ==========
const quillEditorRef = ref<InstanceType<typeof QuillEditor> | null>(null)
const quillEditorKey = ref(0)
const isEditorFullscreen = ref(false)

const editorToolbar = ref([
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ color: [] }, { background: [] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["image"],
  ["link"]
])

const quillModules = {
  name: "blotFormatter",
  module: BlotFormatter,
  options: {}
}

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false
  const lowerUrl = url.toLowerCase().trim()
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"]
  if (dangerousProtocols.some(p => lowerUrl.startsWith(p))) return false
  if (!lowerUrl.startsWith("http://") && !lowerUrl.startsWith("https://")) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

function handleImageUpload() {
  const input = document.createElement("input")
  input.setAttribute("type", "file")
  input.setAttribute("accept", "image/jpeg,image/png,image/gif,image/webp")
  input.click()

  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      ElMessage.error("请上传 JPG/PNG/GIF/WebP 格式的图片")
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      ElMessage.error("图片大小不能超过 50MB")
      return
    }

    const quill = quillEditorRef.value?.getQuill()
    if (!quill) return

    const range = quill.getSelection(true)
    const insertIndex = range.index

    const editorContainer = quill.container as HTMLElement
    const placeholder = document.createElement("div")
    placeholder.className = "image-upload-overlay"
    placeholder.innerHTML = `
      <div class="placeholder-box">
        <span class="placeholder-icon">📷</span>
        <span class="placeholder-text">上传中......</span>
        <span class="placeholder-progress">
          <span class="placeholder-progress-bar" style="width: 0%"></span>
        </span>
      </div>
    `
    editorContainer.style.position = "relative"
    editorContainer.appendChild(placeholder)
    quill.disable()

    const updateProgress = (percent: number) => {
      const barEl = placeholder.querySelector(".placeholder-progress-bar") as HTMLElement
      if (barEl) barEl.style.width = `${percent}%`
    }
    const removePlaceholder = () => {
      if (placeholder.parentNode) placeholder.remove()
    }

    try {
      const res = await uploadImage(file, updateProgress)
      if (res.code === 0 && res.data?.fullpath) {
        const imageUrl = res.data.fullpath
        if (imageUrl.startsWith("r2")) {
          removePlaceholder()
          quill.enable()
          ElMessage.error("图片插入失败")
          return
        }
        if (!isValidImageUrl(imageUrl)) {
          removePlaceholder()
          quill.enable()
          ElMessage.error("图片地址不合法")
          return
        }
        try {
          await preloadImage(imageUrl)
        } catch { /* ignore */ }
        removePlaceholder()
        quill.enable()
        quill.insertEmbed(insertIndex, "image", imageUrl)
        quill.insertText(insertIndex + 1, "\n")
        quill.setSelection(insertIndex + 2, 0)
        ElMessage.success("图片上传成功")
      } else {
        removePlaceholder()
        quill.enable()
        ElMessage.error(res.msg || "图片上传失败")
      }
    } catch {
      removePlaceholder()
      quill.enable()
      ElMessage.error("图片上传失败")
    }
  }
}

function onEditorReady(quill: any) {
  const toolbar = quill.getModule("toolbar")
  if (toolbar) toolbar.addHandler("image", handleImageUpload)
  const editorContainer = quill.root
  if (editorContainer) {
    editorContainer.addEventListener("scroll", () => {
      const blotFormatter = quill.getModule("blotFormatter") as any
      if (blotFormatter && typeof blotFormatter.hide === "function") blotFormatter.hide()
    })
  }
}

function toggleEditorFullscreen() {
  isEditorFullscreen.value = !isEditorFullscreen.value
  const quill = quillEditorRef.value?.getQuill()
  if (quill) {
    const blotFormatter = quill.getModule("blotFormatter") as any
    if (blotFormatter && typeof blotFormatter.hide === "function") blotFormatter.hide()
  }
}

const formRules: FormRules = {
  title: [
    { required: true, message: "请输入活动名称", trigger: "blur" },
    { max: 100, message: "活动名称最多 100 个字", trigger: "blur" }
  ],
  categoryId: [{ required: true, message: "请选择活动分类", trigger: "change" }],
  coverImage: [{ required: true, message: "请上传活动封面图片", trigger: "change" }],
  startTime: [{ required: true, message: "请选择开始时间", trigger: "change" }]
}

// ========== 图片上传 ==========
const uploading = ref(false)

function beforeImageUpload(file: File): boolean {
  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type)
  if (!isImage) {
    ElMessage.error("仅支持上传 jpg、png、webp 格式的图片")
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error("图片大小不能超过 2MB")
    return false
  }
  return true
}

async function customUploadImage(options: UploadRequestOptions) {
  uploading.value = true
  try {
    const res = await uploadFile(options.file)
    if (res.code === 0 && res.data?.fullpath) {
      formData.value.coverImage = res.data.fullpath
      formRef.value?.clearValidate("coverImage")
      ElMessage.success("图片上传成功")
    } else {
      ElMessage.error(res.msg || "图片上传失败")
    }
  } catch (error) {
    console.error(error)
    ElMessage.error("图片上传失败")
  } finally {
    uploading.value = false
  }
}

function removeImage() {
  formData.value.coverImage = ""
}

// ========== 抽屉打开/关闭 ==========
function resetForm() {
  formData.value = createDefaultFormData()
  formRef.value?.clearValidate()
  quillEditorKey.value += 1
}

watch(() => props.visible, (visible) => {
  if (!visible) return
  loadCategories()
  if (props.editData) {
    const item = props.editData
    formData.value = {
      title: item.title,
      categoryId: item.categoryId,
      coverImage: item.coverImage || "",
      location: item.location || "",
      startTime: item.startTime || undefined,
      endTime: item.endTime || undefined,
      description: item.description || "",
      maxParticipants: item.maxParticipants,
      sortOrder: item.sortOrder
    }
  } else {
    resetForm()
  }
})

function handleClose() {
  drawerVisible.value = false
  resetForm()
}

// ========== 提交 ==========
const submitLoading = ref(false)

async function handleSubmit(publishAfterSave = false) {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    const params: ActivityFormParams = {
      title: formData.value.title,
      categoryId: formData.value.categoryId!,
      coverImage: formData.value.coverImage,
      location: formData.value.location || undefined,
      startTime: Number(formData.value.startTime!),
      endTime: formData.value.endTime ? Number(formData.value.endTime) : undefined,
      description: formData.value.description || undefined,
      maxParticipants: formData.value.maxParticipants,
      sortOrder: formData.value.sortOrder
    }

    submitLoading.value = true
    try {
      let savedId: number | null = isEdit.value ? props.editData!.id : null

      if (isEdit.value) {
        const res = await editActivityApi(savedId!, params)
        if (res.code !== 0) return
      } else {
        const res = await addActivityApi(params)
        if (res.code !== 0) return
        savedId = res.data.id
      }

      if (publishAfterSave && savedId) {
        await updateActivityStatusApi(savedId, ActivityStatus.Published)
      }

      ElMessage.success(publishAfterSave ? "保存并发布成功" : (isEdit.value ? "编辑成功" : "保存为草稿成功"))
      handleClose()
      emit("success")
    } catch (error) {
      console.error(error)
    } finally {
      submitLoading.value = false
    }
  })
}
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    :title="drawerTitle"
    size="600px"
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
      class="activity-form"
    >
      <el-form-item label="活动名称" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入活动名称，最多 100 字"
          maxlength="100"
          show-word-limit
          clearable
        />
      </el-form-item>

      <el-form-item label="活动分类" prop="categoryId">
        <el-select
          v-model="formData.categoryId"
          placeholder="请选择活动分类"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="item in categoryOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="活动封面" prop="coverImage">
        <div class="image-upload-wrapper">
          <div v-if="formData.coverImage" class="image-preview">
            <el-image
              :src="formData.coverImage"
              fit="cover"
              class="preview-img"
              :preview-src-list="[formData.coverImage]"
            >
              <template #placeholder>
                <div class="preview-img-skeleton" />
              </template>
            </el-image>
            <el-button type="danger" link @click="removeImage">
              移除
            </el-button>
          </div>
          <el-upload
            v-else
            :show-file-list="false"
            :http-request="customUploadImage"
            :before-upload="beforeImageUpload"
            :disabled="uploading"
            accept="image/jpeg,image/png,image/webp"
          >
            <el-button :loading="uploading">
              <el-icon><Upload /></el-icon>
              上传封面图片
            </el-button>
          </el-upload>
          <div class="upload-tip">
            推荐尺寸 800×800px（1:1 正方形），支持 jpg/png/webp，大小不超过 2MB
          </div>
        </div>
      </el-form-item>

      <el-form-item label="活动地点" prop="location">
        <el-input
          v-model="formData.location"
          placeholder="选填，如：市中心公园"
          maxlength="200"
          clearable
        />
      </el-form-item>

      <el-form-item label="开始时间" prop="startTime">
        <el-date-picker
          v-model="formData.startTime"
          type="datetime"
          placeholder="请选择开始时间"
          value-format="X"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="结束时间" prop="endTime">
        <el-date-picker
          v-model="formData.endTime"
          type="datetime"
          placeholder="选填，不设置则不限制结束时间"
          value-format="X"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="最大人数" prop="maxParticipants">
        <el-input-number
          v-model="formData.maxParticipants"
          :min="0"
          :max="99999"
          controls-position="right"
        />
        <span class="form-tip">0 表示不限制报名人数</span>
      </el-form-item>

      <el-form-item label="排序权重" prop="sortOrder">
        <el-input-number
          v-model="formData.sortOrder"
          :min="0"
          :max="9999"
          controls-position="right"
        />
        <span class="form-tip">值越大越靠前</span>
      </el-form-item>

      <el-form-item label="活动详情" prop="description">
        <div class="editor-wrapper" :class="isEditorFullscreen ? 'editor-wrapper-fullscreen' : ''">
          <QuillEditor
            ref="quillEditorRef"
            :key="quillEditorKey"
            theme="snow"
            v-model:content="formData.description"
            content-type="html"
            :toolbar="editorToolbar"
            :modules="[quillModules]"
            @ready="onEditorReady"
          />
          <span class="zoom-action" @click="toggleEditorFullscreen">
            <el-icon>
              <zoom-out v-if="isEditorFullscreen" />
              <zoom-in v-else />
            </el-icon>
          </span>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="handleClose">
          取消
        </el-button>
        <el-button :loading="submitLoading" @click="handleSubmit(false)">
          存为草稿
        </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit(true)">
          {{ isEdit ? "保存" : "发布" }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style lang="scss" scoped>
.activity-form {
  padding-right: 20px;
}

.image-upload-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-img {
  width: 120px;
  height: 120px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
}

.preview-img-skeleton {
  width: 120px;
  height: 120px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.upload-tip,
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.form-tip {
  margin-left: 12px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.ql-toolbar) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  background-color: #fff;
  border-bottom: 1px solid #ccc;
}

:deep(.ql-container) {
  padding-top: 42px;
}

:deep(.ql-editor) {
  height: 200px;
  width: 100%;
  border-radius: 4px;
}

.editor-wrapper {
  position: relative;
  overflow-y: hidden;
  width: 100%;
}

.editor-wrapper-fullscreen {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  margin-left: -300px;
  width: 600px;
  height: 100vh;
  padding-bottom: 60px;
  box-sizing: border-box;
  z-index: 1000;
  background-color: #fff;
}

.editor-wrapper-fullscreen :deep(.ql-editor) {
  height: 100%;
  width: 100%;
}

.zoom-action {
  position: absolute;
  bottom: 10px;
  right: 10px;
  cursor: pointer;
  font-size: 20px;
  color: var(--el-text-color-regular);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: var(--el-fill-color-light);
  transition: all 0.3s;
  z-index: 3;

  &:hover {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}

:deep(.image-upload-overlay) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 10;
  user-select: none;
}

:deep(.image-upload-overlay .placeholder-box) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 120px;
  background-color: rgba(245, 247, 250, 0.95);
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}

:deep(.image-upload-overlay .placeholder-icon) {
  font-size: 32px;
  margin-bottom: 8px;
}

:deep(.image-upload-overlay .placeholder-text) {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

:deep(.image-upload-overlay .placeholder-progress) {
  width: 80%;
  height: 6px;
  background-color: #e4e7ed;
  border-radius: 3px;
  overflow: hidden;
}

:deep(.image-upload-overlay .placeholder-progress-bar) {
  height: 100%;
  background-color: #409eff;
  border-radius: 3px;
  transition: width 0.2s ease;
}
</style>
