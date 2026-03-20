<!-- web/src/pages/course/detail/component/CourseInfo.vue -->
<script lang="ts" setup>
import type { courseDataModel } from "@/api/course/course"
import { ElMessage } from "element-plus"
import { ref, watch } from "vue"

const props = defineProps<{
  courseInfo: courseDataModel | null
}>()

const isEditing = ref(false)
const formRef = ref()

// 表单数据模型
const formData = ref({
  name: "",
  description: "",
  // lessonCount: 0,
  status: 1
})

// 监听 courseInfo 变化并同步到 formData
watch(() => props.courseInfo, (newVal) => {
  if (newVal) {
    formData.value = {
      name: newVal.name || "",
      description: newVal.description || "",
      // lessonCount: newVal.lessonCount || 0,
      status: newVal.status ?? 1
    }
  }
}, { immediate: true })

// 开始编辑
function startEdit() {
  isEditing.value = true
}

// 提交修改
async function submitForm() {
  // 这里应该调用API保存数据
  // await updateCourseAPI(formData.value)
  ElMessage.success("课程信息更新成功")
  isEditing.value = false
}

// 取消编辑
function cancelEdit() {
  // 恢复原始数据
  if (props.courseInfo) {
    formData.value = {
      name: props.courseInfo.name || "",
      description: props.courseInfo.description || "",
      // lessonCount: props.courseInfo.lessonCount || 0,
      status: props.courseInfo.status ?? 1
    }
  }
  isEditing.value = false
}
</script>

<template>
  <div class="course-info-component">
    <el-form
      ref="formRef"
      :model="formData"
      :disabled="!isEditing"
      label-width="100px"
    >
      <el-form-item label="课程名称" required>
        <el-input v-model="formData.name" autocomplete="off" :minlength="1" :maxlength="100" clearable show-word-limit />
      </el-form-item>

      <el-form-item label="课程描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          :maxlength="200"
          show-word-limit
          placeholder="请输入课程描述"
        />
      </el-form-item>

      <el-form-item label="创建日期">
        <el-input
          :value="props.courseInfo?.createdDate || '-'"
          disabled
        />
      </el-form-item>
    </el-form>

    <div class="button-group">
      <div v-if="!isEditing">
        <el-button type="primary" @click="startEdit">
          编辑
        </el-button>
      </div>
      <div v-else>
        <el-button type="primary" @click="submitForm">
          保存
        </el-button>
        <el-button @click="cancelEdit">
          取消
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-info-component {
  padding: 20px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
</style>
