<script lang="ts" setup>
import type { ClassCourseModel } from "@/api/class/course"
import type { courseListItem } from "@/api/course/course"
import courseIcon from "@@/assets/images/course.png"
import { ElMessage, ElMessageBox } from "element-plus"
import { onMounted, ref } from "vue"
import { getClassCoursesApi, importCourseTemplateApi } from "@/api/class/course"
import { getCategoriesApi } from "@/api/course/category"
import { addCourseApi, getCoursesApi } from "@/api/course/course"
import CourseCatalog from "./CourseCatalog.vue"

// Props定义
interface Props {
  classId: number
  usersUpdatedKey?: number // 用户数据更新标识，用于通知 CourseCatalog 刷新教师/大使数据
}
const props = defineProps<Props>()

// 数据状态
const loading = ref(false)
const courses = ref<ClassCourseModel[]>([])
const activeCourse = ref<ClassCourseModel>()

// 弹窗组件
const addCourseModal = reactive({
  visible: false,
  courseName: "",
  courseDescription: "",
  courseCategaryId: undefined as number | undefined,
  categoryList: [] as any[],
  submitting: false
})

// 获取课程数据
async function fetchCourses() {
  loading.value = true
  try {
    const res = await getClassCoursesApi(props.classId)
    if (res.code === 0) {
      courses.value = res.data
      if (courses.value.length > 0) {
        if (!activeCourse.value) {
          activeCourse.value = courses.value[0]
        }
      }
    } else {
      ElMessage.error(res.msg)
    }
  } catch (error) {
    ElMessage.error("获取课程失败")
    console.log(error)
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  if (props.classId) {
    fetchCourses()
  }
})

// 监听 classId 变化（用于 classId 动态更新的场景）
watch(
  () => props.classId,
  (newClassId: number) => {
    if (newClassId) {
      fetchCourses()
    }
  }
)

// 新增课程
function handleAddCourse() {
  // 打开新增课程弹窗
  // 获得categoryList
  getCategoriesApi().then((res) => {
    if (res.code === 0) {
      addCourseModal.categoryList = res.data
    }
  })
  addCourseModal.visible = true
}

// 添加课程成功回调
async function handleAddCourseSuccess() {
  addCourseModal.submitting = true
  try {
    // 刷新课程数据
    const res = await addCourseApi({
      name: addCourseModal.courseName,
      description: addCourseModal.courseDescription,
      categoryId: addCourseModal.courseCategaryId!,
      classId: props.classId,
      status: 1
    })
    if (res.code === 0) {
      ElMessage.success("新增课程成功")
      fetchCourses()
      addCourseModal.visible = false
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    addCourseModal.submitting = false
  }
}
// 模拟课程模板数据
const templateList = ref<courseListItem[]>([])

// 控制弹窗显示
const importTemplateDialog = reactive({
  visible: false,
  submitting: false
})

// 当前选中的模板索引
const selectedTemplate = ref<number | null>(null)

// 选择模板
function selectTemplate(courseId: number) {
  selectedTemplate.value = courseId
}

// 点击导入按钮（暂不实现）
async function handleImport() {
  if (selectedTemplate.value === null) {
    ElMessage.warning("请先选择一个模板")
    return
  }
  importTemplateDialog.submitting = true
  try {
    const res = await importCourseTemplateApi({ classId: props.classId, courseId: selectedTemplate.value! })
    if (res.code === 0) {
      importTemplateDialog.visible = false

      fetchCourses()

      // 使用 confirm 提示用户
      ElMessageBox.confirm(
        "已导入课程模板，请编辑相应课节进行排课！",
        "提示",
        {
          confirmButtonText: "立即排课",
          showCancelButton: false,
          type: "success"
        }
      )
    } else {
      ElMessage.error(res.msg)
    }
  } catch (error) {
    ElMessage.error("导入课程失败")
    console.log(error)
  } finally {
    importTemplateDialog.submitting = false
  }
}

async function fetchTemplates() {
  const res = await getCoursesApi({ page: 1, pageSize: 1000 })
  if (res.code === 0) {
    templateList.value = res.data.list
  } else {
    ElMessage.error(res.msg)
  }
}
function handleImportTemplate() {
  fetchTemplates()
  importTemplateDialog.visible = true
  selectedTemplate.value = null // 清空上次选择
}
// function changeActiveCourse(courseId: number) {
//   courses.value.forEach((item: ClassCourseModel) => {
//     if (item.courseId === courseId) {
//       activeCourse.value = item
//     }
//   })
// }
</script>

<template>
  <div class="tab-content">
    <div class="section">
      <!-- 加载中状态 -->
      <div v-if="loading" v-loading="true" class="loading-container" />
      <!-- 有课程内容 -->
      <template v-else-if="activeCourse">
        <div class="section-header">
          {{ activeCourse.name }}
        </div>
        <div class="section-content">
          <CourseCatalog
            :class-id="activeCourse.classId"
            :course-id="activeCourse.courseId"
            :users-updated-key="props.usersUpdatedKey"
          />
        </div>
      </template>
      <!-- 空状态 -->
      <div v-else>
        <div class="empty-data">
          <el-empty description="暂无数据" :image-size="100" />
          <div class="btn-group">
            <el-button type="primary" @click="handleImportTemplate">
              导入课程模板
            </el-button>
            <el-button @click="handleAddCourse">
              新增课程
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增课程弹窗 -->
    <el-dialog v-model="addCourseModal.visible" title="新增课程">
      <el-form label-width="80px">
        <el-form-item label="课程名称">
          <el-input v-model="addCourseModal.courseName" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="课程分类">
          <el-select v-model="addCourseModal.courseCategaryId" placeholder="请选择课程分类">
            <el-option
              v-for="item in addCourseModal.categoryList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="课程描述">
          <el-input
            type="textarea"
            v-model="addCourseModal.courseDescription"
            placeholder="请输入课程描述"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="addCourseModal.submitting" @click="handleAddCourseSuccess">
            确定
          </el-button>
          <el-button @click="addCourseModal.visible = false">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    <!-- 导入课程模板弹窗 -->
    <el-dialog v-model="importTemplateDialog.visible" title="导入课程模板" width="500px">
      <div class="template-list">
        <div
          v-for="(item, index) in templateList"
          :key="index"
          class="template-item"
          :class="{ active: selectedTemplate === item.courseId }"
          @click="selectTemplate(item.courseId)"
        >
          <div class="icon">
            <!-- <i class="el-icon-document"></i> -->
            <img :src="courseIcon" alt="">
            <!-- <el-icon><Reading /></el-icon> -->
          </div>
          <div class="content">
            <div class="title">
              {{ item.name }}
            </div>
            <div class="desc">
              {{ item.lessonCount }}课节
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="importTemplateDialog.visible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="importTemplateDialog.submitting" @click="handleImport">
          导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.loading-container {
  min-height: 200px;
}

.section {
  margin-bottom: 30px;
}

.section-header {
  font-size: 14px;
  font-weight: 400;
  line-height: 24px;
  color: #000;
  margin-bottom: 16px;
}

.table-wrapper {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.el-table {
  background-color: white;
}

.el-table th {
  background-color: #f5f7fa;
  color: #909399;
  font-weight: 500;
}

.el-table td {
  padding: 12px 16px;
}

.el-table .cell {
  font-size: 14px;
  color: #303133;
}

.empty-data {
  text-align: center;
  padding: 80px 0;
  color: #909399;
  background-color: #f5f7fa; /* 浅灰色背景 */
  border: 1px solid #e4e7ed; /* 边框 */
  border-radius: 4px; /* 圆角 */
  margin: 20px 0;
}

.empty-data .icon {
  font-size: 60px;
  margin-bottom: 15px;
  color: #c0c4cc;
}

.empty-data .title {
  font-size: 14px;
  margin-bottom: 30px;
}
.name {
  color: #909399;
}
.el-dropdown-link {
  display: flex;
  align-items: center;
  margin-left: 15px;
  cursor: pointer;
  color: var(--el-color-primary);
}

.empty-data .btn-group {
  display: flex;
  justify-content: center;
  gap: 15px;
}
.template-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-height: 560px;
  overflow-y: auto;
}

.template-item {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background-color: #f5f7fa;
    border-color: #c0c4cc;
  }

  &.active {
    border-color: #409eff;
    background-color: #f5f7fa;
  }
}

.icon {
  font-size: 16px;
  color: #409eff;
}

.content {
  flex: 1;
}

.title {
  font-size: 14px;
  color: #303133;
  margin: 0;
}

.desc {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 0;
}
</style>
