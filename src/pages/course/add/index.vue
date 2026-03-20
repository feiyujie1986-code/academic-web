<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { categoryDataModel } from "@/api/course/category"
import { reactive, ref } from "vue"
import { getCategoriesApi } from "@/api/course/category"
import { addCourseApi } from "@/api/course/course"
import CategoryDialog from "../components/CategoryDialog.vue"
import { useCategoryManagement } from "../hooks/useCategoryManagement"

defineOptions({
  name: "CourseAdd"
})

const router = useRouter()
const loading = ref<boolean>(false)

// 分类选项
const categoryOptions = ref<categoryDataModel[]>([])

// 获取分类选项
async function getCategoryOptions() {
  try {
    const res = await getCategoriesApi()
    if (res.code === 0) {
      categoryOptions.value = res.data
    }
  } catch (error) {
    console.log(error)
  }
}
getCategoryOptions()

// 使用分类管理 composable
const {
  categoryDialogVisible,
  categoryFormData,
  categoryFormRules,
  openAddCategoryDialog,
  closeCategoryDialog,
  addCategoryAction
} = useCategoryManagement(getCategoryOptions)

// 表单相关
const formRef = ref<FormInstance>()
const formData = reactive({
  name: "",
  description: "",
  categoryId: undefined as number | undefined,
  status: 1
})

const formRules: FormRules = reactive({
  name: [{ required: true, trigger: "blur", message: "请输入课程名称" }]
})

// 返回列表页
function goBack() {
  router.back()
}

// 执行添加操作
function submitForm(formEl: FormInstance | undefined) {
  if (!formEl) return

  formEl.validate(async (valid) => {
    if (valid) {
      // 增加防止多次触发请求
      if (loading.value) {
        return
      }
      loading.value = true
      try {
        const res = await addCourseApi({
          name: formData.name,
          description: formData.description,
          categoryId: formData.categoryId!,
          classId: 0,
          status: formData.status
        })
        if (res.code === 0) {
          const courseId = (res.data as any)?.id || (res.data as any)?.courseId
          ElMessageBox.confirm(
            "课程模板创建成功，是否前往排课？",
            "提示",
            {
              confirmButtonText: "立即排课",
              cancelButtonText: "返回课程模板列表",
              type: "success",
              closeOnClickModal: false
            }
          ).then(() => {
            // 去排课：跳转到课程详情的课程目录标签
            router.push({
              name: "CourseDetail",
              params: {
                id: courseId
              },
              query: {
                tab: "catalog"
              }
            })
          }).catch(() => {
            // 返回课程模板列表
            router.back()
          })
        }
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<template>
  <div class="app-container">
    <el-card v-loading="loading" shadow="never">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="right"
        style="max-width: 800px; margin: 20px auto"
      >
        <!-- 课程名称 -->
        <el-form-item label="课程名称" prop="name">
          <el-input v-model="formData.name" autocomplete="off" :maxlength="100" clearable show-word-limit />
        </el-form-item>

        <!-- 分类 -->
        <el-form-item label="分类" prop="categoryId">
          <div style="display: flex; width: 100%">
            <el-select v-model="formData.categoryId" placeholder="请选择分类" style="flex: 1">
              <el-option
                v-for="item in categoryOptions"
                :key="item.categoryId"
                :label="item.name"
                :value="item.categoryId"
              />
            </el-select>
            <el-button
              type="primary"
              link
              icon="Plus"
              style="margin-left: 10px"
              @click="openAddCategoryDialog"
            >
              添加分类
            </el-button>
          </div>
        </el-form-item>

        <!-- 描述 -->
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            :maxlength="200"
            show-word-limit
            placeholder="请输入课程描述"
          />
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submitForm(formRef)">
            立即创建
          </el-button>
          <el-button @click="goBack">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 添加分类对话框 -->
    <CategoryDialog
      v-model:visible="categoryDialogVisible"
      :form-data="categoryFormData"
      :form-rules="categoryFormRules"
      @confirm="addCategoryAction"
      @close="closeCategoryDialog"
    />
  </div>
</template>
