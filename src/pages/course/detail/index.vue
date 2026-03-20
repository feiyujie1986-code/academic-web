<!-- 修改 script 部分的代码 -->
<script lang="ts" setup>
import type { courseDataModel } from "@/api/course/course"
import { formatDateTime } from "@@/utils/datetime"
import { onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { getCourseInfoApi } from "@/api/course/course"
// 引入新创建的组件
import CourseCatalog from "../../class/detail/components/CourseCatalog.vue"
import CourseInfo from "./components/CourseInfo.vue"

defineOptions({
  name: "CourseDetail"
})

const route = useRoute()
const router = useRouter()
// 将 computed 改为 ref，并添加 setter
const activeTab = ref<string>("catalog")
const loading = ref<boolean>(false)
const courseInfo = ref<courseDataModel | null>(null)

// 获取课程ID
const courseId = ref<number>(0)

// 监听路由变化同步 activeTab
watch(() => route.query.tab, (newTab) => {
  const tab = Array.isArray(newTab) ? newTab[0] || "catalog" : (newTab || "catalog")
  activeTab.value = tab
}, { immediate: true })

// 监听 activeTab 变化，同步到路由
watch(activeTab, (newTab) => {
  if (newTab !== (Array.isArray(route.query.tab) ? route.query.tab[0] || "catalog" : (route.query.tab || "catalog"))) {
    router.replace({
      query: {
        ...route.query,
        tab: newTab
      }
    })
  }
})

// 获取课程信息
async function getCourseInfo() {
  if (!courseId.value) return

  loading.value = true
  try {
    const res = await getCourseInfoApi(courseId.value)
    if (res.code === 0) {
      courseInfo.value = res.data
      courseInfo.value.createdDate = formatDateTime(courseInfo.value.createdAt * 1000)
    }
  } catch (error) {
    console.log(error)
  } finally {
    loading.value = false
  }
}

// 组件挂载时获取课程信息
onMounted(() => {
  // 从路由参数获取课程ID
  const id = route.params.id
  if (id && !Number.isNaN(Number(id))) {
    courseId.value = Number(id)
    getCourseInfo()
  } else {
    ElMessage.error("无效的课程ID")
  }
})
function handleLessonCount(count: number) {
  if (courseInfo.value) {
    courseInfo.value.lessonCount = count
  }
}
</script>

<template>
  <div class="app-container">
    <el-card v-loading="loading" shadow="never" class="couse-info-card">
      <div class="course-header">
        <div class="course-info">
          <h2 v-if="courseInfo">
            {{ courseInfo.name }}
          </h2>
          <p v-if="courseInfo">
            <span>课节数: {{ courseInfo.lessonCount || 0 }}</span>
          </p>
        </div>
      </div>
    </el-card>
    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="课程信息" name="info">
          <!-- 使用课程信息组件 -->
          <CourseInfo :course-info="courseInfo" />
        </el-tab-pane>
        <el-tab-pane label="课程目录" name="catalog">
          <!-- 使用课程目录组件 -->
          <CourseCatalog
            :class-id="null"
            :course-id="courseId" @update-lesson-count="handleLessonCount"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.couse-info-card {
  margin-bottom: 12px;
}
.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.course-info h2 {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 500;
}

.course-info p {
  margin: 0;
  color: #666;
}

.course-actions {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .course-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .course-actions {
    margin-top: 15px;
  }
}
</style>
