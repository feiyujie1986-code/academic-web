<script lang="ts" setup>
import type { FormInstance, FormRules, UploadRequestOptions } from "element-plus"
import type { ActivityFormParams, ActivityListItem } from "@/api/activity/activity"
import type { ActivityCategoryItem } from "@/api/activity/category"
import { ActivityStatus, addActivityApi, editActivityApi, updateActivityStatusApi } from "@/api/activity/activity"
import { getAllCategoriesApi } from "@/api/activity/category"
import { uploadFile } from "@/api/fileM/file"

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
      startTime: formData.value.startTime!,
      endTime: formData.value.endTime || undefined,
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
            />
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
        <el-input
          v-model="formData.description"
          type="textarea"
          placeholder="选填，活动详细介绍"
          :rows="5"
          maxlength="5000"
          show-word-limit
        />
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
</style>
