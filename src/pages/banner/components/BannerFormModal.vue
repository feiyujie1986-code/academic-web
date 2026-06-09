<script lang="ts" setup>
import type { FormInstance, FormRules, UploadRequestOptions } from "element-plus"
import type { BannerFormParams, BannerListItem } from "@/api/banner/banner"
import {
  addBannerApi,
  BannerLinkType,
  BannerStatus,
  editBannerApi,
  linkTypeLabelMap
} from "@/api/banner/banner"
import { uploadFile } from "@/api/fileM/file"

interface Props {
  visible: boolean
  editData: BannerListItem | null
}

interface Emits {
  (e: "update:visible", value: boolean): void
  (e: "success"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
})

const isEdit = computed(() => !!props.editData)
const dialogTitle = computed(() => (isEdit.value ? "编辑 Banner" : "新增 Banner"))

// ========== 表单数据 ==========
const formRef = ref<FormInstance>()

function createDefaultFormData() {
  return {
    title: "",
    subtitle: "",
    imageUrl: "",
    linkType: BannerLinkType.None,
    linkTarget: "",
    sortOrder: 0,
    status: BannerStatus.Active,
    timeRange: "" as string | [string, string]
  }
}

const formData = ref(createDefaultFormData())

const linkTypeOptions = Object.entries(linkTypeLabelMap).map(([value, label]) => ({
  value: Number(value),
  label
}))

// 跳转目标输入提示（不同跳转类型对应不同目标含义）
const linkTargetMeta = computed(() => {
  switch (formData.value.linkType) {
    case BannerLinkType.Activity:
      return { label: "活动 ID", placeholder: "请输入活动 ID", isUrl: false }
    case BannerLinkType.Note:
      return { label: "笔记 ID", placeholder: "请输入笔记 ID", isUrl: false }
    case BannerLinkType.Community:
      return { label: "社群 ID", placeholder: "请输入社群 ID（跳转后可加群）", isUrl: false }
    case BannerLinkType.Url:
      return { label: "链接地址", placeholder: "请输入完整的 URL，如 https://example.com", isUrl: true }
    default:
      return null
  }
})

function validateLinkTarget(_rule: unknown, value: string, callback: (error?: Error) => void) {
  if (formData.value.linkType === BannerLinkType.None) {
    callback()
    return
  }
  if (!value) {
    callback(new Error("请输入跳转目标"))
    return
  }
  if (linkTargetMeta.value?.isUrl) {
    if (!/^https?:\/\/\S+$/i.test(value)) {
      callback(new Error("请输入合法的 URL，需以 http:// 或 https:// 开头"))
      return
    }
  } else if (!/^\d+$/.test(value)) {
    callback(new Error("请输入合法的 ID（数字）"))
    return
  }
  callback()
}

const formRules: FormRules = {
  imageUrl: [{ required: true, message: "请上传 Banner 图片", trigger: "change" }],
  linkTarget: [{ validator: validateLinkTarget, trigger: "blur" }],
  sortOrder: [{ required: true, message: "请输入排序权重", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
}

// 切换跳转类型时清空目标值，避免类型与值不匹配
watch(() => formData.value.linkType, () => {
  formData.value.linkTarget = ""
  formRef.value?.clearValidate("linkTarget")
})

// ========== 图片上传 ==========
const uploading = ref(false)

function beforeImageUpload(file: File): boolean {
  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type)
  if (!isImage) {
    ElMessage.error("仅支持上传 jpg、png、webp 格式的图片")
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片大小不能超过 5MB")
    return false
  }
  return true
}

async function customUploadImage(options: UploadRequestOptions) {
  uploading.value = true
  try {
    const res = await uploadFile(options.file)
    if (res.code === 0 && res.data?.fullpath) {
      formData.value.imageUrl = res.data.fullpath
      formRef.value?.clearValidate("imageUrl")
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
  formData.value.imageUrl = ""
}

// ========== 弹窗打开/关闭 ==========
function resetForm() {
  formData.value = createDefaultFormData()
  formRef.value?.clearValidate()
}

watch(() => props.visible, (visible) => {
  if (!visible) return
  if (props.editData) {
    const item = props.editData
    formData.value = {
      title: item.title || "",
      subtitle: item.subtitle || "",
      imageUrl: item.imageUrl || "",
      linkType: item.linkType,
      linkTarget: item.linkTarget || "",
      sortOrder: item.sortOrder,
      status: item.status,
      timeRange: item.startTime && item.endTime
        ? [String(item.startTime), String(item.endTime)]
        : ""
    }
  } else {
    resetForm()
  }
})

function handleClose() {
  dialogVisible.value = false
  resetForm()
}

// ========== 提交 ==========
const submitLoading = ref(false)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    const params: BannerFormParams = {
      title: formData.value.title || undefined,
      subtitle: formData.value.subtitle || undefined,
      imageUrl: formData.value.imageUrl,
      linkType: formData.value.linkType,
      linkTarget: formData.value.linkType === BannerLinkType.None ? "" : formData.value.linkTarget,
      sortOrder: formData.value.sortOrder,
      status: formData.value.status,
      startTime: Array.isArray(formData.value.timeRange) ? Number(formData.value.timeRange[0]) : 0,
      endTime: Array.isArray(formData.value.timeRange) ? Number(formData.value.timeRange[1]) : 0
    }

    submitLoading.value = true
    try {
      const res = isEdit.value
        ? await editBannerApi(props.editData!.id, params)
        : await addBannerApi(params)
      if (res.code === 0) {
        ElMessage.success(isEdit.value ? "编辑成功" : "新增成功")
        handleClose()
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
    :title="dialogTitle"
    width="640px"
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
      <el-form-item label="标题" prop="title">
        <el-input v-model="formData.title" placeholder="选填，最长 100 字" maxlength="100" show-word-limit clearable />
      </el-form-item>

      <el-form-item label="副标题" prop="subtitle">
        <el-input v-model="formData.subtitle" placeholder="选填，最长 255 字" maxlength="255" show-word-limit clearable />
      </el-form-item>

      <el-form-item label="Banner 图片" prop="imageUrl">
        <div class="image-upload-wrapper">
          <div v-if="formData.imageUrl" class="image-preview">
            <el-image :src="formData.imageUrl" fit="cover" class="preview-img" :preview-src-list="[formData.imageUrl]" />
            <el-button type="danger" link class="remove-btn" @click="removeImage">
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
              上传图片
            </el-button>
          </el-upload>
          <div class="upload-tip">
            建议尺寸 1242×699px（比例 16:9），支持 jpg/png/webp，大小建议控制在 200-500KB 以内（不超过 5MB）
          </div>
        </div>
      </el-form-item>

      <el-form-item label="跳转类型" prop="linkType">
        <el-select v-model="formData.linkType" placeholder="请选择跳转类型" style="width: 220px">
          <el-option v-for="item in linkTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="linkTargetMeta" :label="linkTargetMeta.label" prop="linkTarget">
        <el-input v-model="formData.linkTarget" :placeholder="linkTargetMeta.placeholder" clearable />
      </el-form-item>

      <el-form-item label="排序权重" prop="sortOrder">
        <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" controls-position="right" />
        <span class="form-tip">值越小越靠前</span>
      </el-form-item>

      <el-form-item label="生效时间" prop="timeRange">
        <el-date-picker
          v-model="formData.timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="X"
        />
        <span class="form-tip">不设置表示不限制生效时间</span>
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="BannerStatus.Active">
            启用
          </el-radio>
          <el-radio :value="BannerStatus.Inactive">
            禁用
          </el-radio>
        </el-radio-group>
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
  width: 240px;
  height: 120px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
}

.upload-tip,
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.form-tip {
  margin-left: 12px;
}
</style>
