<script lang="ts" setup>
import type { ClassUserModel } from "@/api/class/user"
import type { ChapterItem, fileMeta, LessonItem } from "@/api/course/lesson"
import lessonDiscussImg from "@@/assets/images/lesson-discuss.png?url"
import lessonIconDiscuss from "@@/assets/images/lesson-icon-discuss.png?url"
import lessonIconLive from "@@/assets/images/lesson-icon-live.png?url"
import lessonIconText from "@@/assets/images/lesson-icon-text.png?url"
import lessonIconVideo from "@@/assets/images/lesson-icon-video.png?url"
import lessonIconWork from "@@/assets/images/lesson-icon-work.png?url"
import lessonLiveImg from "@@/assets/images/lesson-live.png?url"
import lessonTextImg from "@@/assets/images/lesson-text.png?url"
import lessonVideoImg from "@@/assets/images/lesson-video.png?url"
import lessonWorkImg from "@@/assets/images/lesson-work.png?url"
// eslint-disable-next-line unused-imports/no-unused-imports
import { ArrowDown, ArrowUp, Delete, Edit } from "@element-plus/icons-vue"
// import { ElMessage, ElMessageBox } from "element-plus"
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { getClassUsersApi } from "@/api/class/user"
import { addChapterApi, deleteChapterApi, editChapterApi } from "@/api/course/chapter"
import { deleteLessonApi, getCourseLessons } from "@/api/course/lesson"
import CustomText from "@/common/components/CustomText/index.vue"
import AttachmentModal from "@/pages/class/components/AttachmentModal.vue"
import { useAppStore } from "@/pinia/stores/app"
import LessonDetail from "./LessonDetail.vue"
import LessonForm from "./LessonForm.vue"
import { LessonType } from "./tools"

interface Props {
  courseId: number
  classId: number | null
  usersUpdatedKey?: number // 用户数据更新标识，用于在教师/大使数据变化时刷新
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: "updateLessonCount", count: number): void
}>()
const catalogLoading = ref(false)
const initialized = ref(false) // 首次加载完成标识
const courseLessons = ref<ChapterItem[]>([])
const teachers = ref<ClassUserModel[]>([])
const seniorTeachers = ref<ClassUserModel[]>([])

// 获取 appStore 来监听 sidebar 状态
const appStore = useAppStore()
const isSidebarOpened = computed(() => appStore.sidebar.opened)

// 章节折叠状态管理
const chapterCollapseMap = ref<Map<number, boolean>>(new Map())

// 切换章节折叠状态
function toggleChapterCollapse(chapterId: number) {
  const currentState = chapterCollapseMap.value.get(chapterId) || false
  chapterCollapseMap.value.set(chapterId, !currentState)
}

// 检查章节是否折叠
function isChapterCollapsed(chapterId: number): boolean {
  return chapterCollapseMap.value.get(chapterId) || false
}

// 章节标签管理
const MAX_VISIBLE_TABS = 10
const activeTabName = ref<string>("")

// 计算可见的章节和隐藏的章节
const visibleChapters = computed(() => {
  return courseLessons.value.slice(0, MAX_VISIBLE_TABS)
})

const hiddenChapters = computed(() => {
  return courseLessons.value.slice(MAX_VISIBLE_TABS)
})

const hasHiddenChapters = computed(() => {
  return courseLessons.value.length > MAX_VISIBLE_TABS
})

function refreshLessonCount() {
  if (props.classId === null) { // 课程路由入口，刷新课节数量
    emit("updateLessonCount", courseLessons.value.reduce((acc, chapter) => acc + chapter.lessons.length, 0))
  }
}

// 获取用户数据
async function fetchUserData() {
  if (!props.classId) { // 课程路由入口或classId无效
    return
  }
  // 清空之前的数据，避免重复
  teachers.value = []
  seniorTeachers.value = []

  getClassUsersApi(props.classId, ["teacher", "senior_teacher"])
    .then((res) => {
      if (res.code === 0) {
        res.data.forEach((item) => {
          if (item.userType === "senior_teacher") {
            seniorTeachers.value.push(item)
          } else if (item.userType === "teacher") {
            teachers.value.push(item)
          }
        })
      } else {
        ElMessage.error(res.msg)
      }
    })
    .finally(() => {
    })
}

// 监听 classId 变化，确保 classId 有效时获取用户数据
watch(
  () => props.classId,
  (newClassId: number | null) => {
    if (newClassId) {
      fetchUserData()
    }
  },
  { immediate: true }
)

// 监听 usersUpdatedKey 变化，当教师/大使数据在其他 Tab 更新时刷新用户数据
watch(
  () => props.usersUpdatedKey,
  () => {
    if (props.classId) {
      fetchUserData()
    }
  }
)

async function fetchActiveCourseLesson() {
  if (!props.courseId) return
  catalogLoading.value = true
  try {
    const res = await getCourseLessons({ courseId: props.courseId })
    if (res.code === 0) {
      courseLessons.value = res.data ?? []

      // 初始化第一个章节为激活状态
      if (courseLessons.value.length > 0) {
        activeTabName.value = String(courseLessons.value[0].chapterId)
      }
    } else {
      ElMessage.error(res.msg)
    }
  } catch (error) {
    ElMessage.error("获取课程详情失败")
    console.log(error)
  } finally {
    catalogLoading.value = false
    initialized.value = true
  }
}

// 监听属性变化
watch(
  () => props.courseId,
  (newCourseId) => {
    if (newCourseId) {
      fetchActiveCourseLesson()
    }
  },
  { immediate: true }
)

function switchChapter(chapter: ChapterItem) {
  activeTabName.value = String(chapter.chapterId)
  // 滚动到对应章节
  const chapterElement = document.getElementById(`chapter-${chapter.chapterId}`)
  if (chapterElement) {
    chapterElement.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

// el-tabs 切换处理 - 实现锚点滚动
function handleTabChange(name: string | number) {
  if (name === "add-chapter") {
    addChapter()
    return
  }
  const chapter = courseLessons.value.find(c => c.chapterId === Number(name))
  if (chapter) {
    activeTabName.value = String(chapter.chapterId)
    // 滚动到对应章节
    const chapterElement = document.getElementById(`chapter-${chapter.chapterId}`)
    if (chapterElement) {
      chapterElement.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }
}

const addChapterModal = ref({
  visible: false,
  title: "新增章节",
  kind: "Add"
})
const chapterSubmitting = ref(false)

// 章节表单状态
const chapterFormState = reactive({
  name: "",
  courseId: props.courseId,
  id: 0,
  classId: props.classId
})

function addChapter() {
  // 打开新增章节模态框
  addChapterModal.value.visible = true
  addChapterModal.value.kind = "Add"
  addChapterModal.value.title = "新增章节"
}

function editChapter(chapter: any) {
  addChapterModal.value.visible = true
  addChapterModal.value.kind = "Edit"
  addChapterModal.value.title = "修改章节"
  chapterFormState.name = chapter.name
  chapterFormState.id = chapter.chapterId
}

async function handleAddChapter() {
  // 清理name字段的前后空白
  const trimmedName = chapterFormState.name.trim()

  // 验证长度不为空且不大于100
  if (!trimmedName) {
    ElMessage({ type: "error", message: "章节名称为必填字段" })
    return
  }
  if (trimmedName.length > 100) {
    ElMessage({ type: "error", message: "章节名称长度不能超过100个字符" })
    return
  }

  chapterSubmitting.value = true
  try {
    if (addChapterModal.value.kind === "Edit") {
      // 编辑现有章节
      await editChapterApi({ name: trimmedName, id: chapterFormState.id }).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          // 修改courseLessons对应的章节name
          courseLessons.value = courseLessons.value.map((chapter) => {
            if (chapter.chapterId === chapterFormState.id) {
              return {
                ...chapter,
                name: trimmedName
              }
            }
            return chapter
          })
        }
      })
    } else if (addChapterModal.value.kind === "Add") {
      // 添加新章节
      await addChapterApi({
        name: trimmedName,
        courseId: props.courseId,
        classId: props.classId
      }).then(async (res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          // 在courseLessons中添加新章节
          const newChapter = {
            chapterId: res.data.chapterId,
            courseId: chapterFormState.courseId,
            name: trimmedName,
            sort: res.data.sort,
            classId: chapterFormState.classId,
            isShow: 1,
            lessons: [] as LessonItem[]
          }
          courseLessons.value.push(newChapter)
          // 初始化新章节的折叠状态为展开（false表示不折叠）
          chapterCollapseMap.value.set(newChapter.chapterId, false)
          // 等待DOM更新后再切换到新添加的章节并滚动
          await nextTick()
          switchChapter(newChapter)
        }
      })
    }
    // 关闭模态框并重置表单
    handleCancelChapter()
  } catch (error) {
    console.error("保存失败:", error)
    ElMessage({ type: "error", message: "保存失败，请重试" })
  } finally {
    chapterSubmitting.value = false
  }
}

function handleCancelChapter() {
  // 取消新增章节的逻辑
  addChapterModal.value.visible = false
  chapterFormState.id = 0
  chapterFormState.name = ""
}

function deleteChapter(chapter: any) {
  ElMessageBox.confirm(`确定要删除章节 "${chapter.name}" 吗？`, "确认删除", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    try {
      deleteChapterApi(chapter.chapterId).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          // 删除courseLessons中对应的章节
          courseLessons.value = courseLessons.value.filter(chapterItem => chapterItem.chapterId !== chapter.chapterId)
          // 从折叠状态Map中删除对应的章节
          chapterCollapseMap.value.delete(chapter.chapterId)
          refreshLessonCount()
        }
      })
    } catch (error) {
      console.error("删除失败:", error)
      ElMessage({ type: "error", message: "删除失败，请重试" })
    }
  }).catch(() => {
    // 取消删除的逻辑
  })
}

const lessonFormRef = ref<InstanceType<typeof LessonForm> | null>(null)
function addLesson(lessonType?: LessonType, moreInfo?: { chapterId?: number }) {
  // 打开子组件的新增表单
  if (lessonFormRef.value && typeof lessonFormRef.value.openForAdd === "function") {
    lessonFormRef.value.openForAdd(moreInfo?.chapterId, lessonType)
  } else {
    ElMessage.info("新增小节功能待开发")
  }
}

function editLesson(lesson: any) {
  if (lessonFormRef.value && typeof lessonFormRef.value.openForEdit === "function") {
    lessonFormRef.value.openForEdit(lesson)
  } else {
    ElMessage.info("编辑小节功能待开发")
  }
}

function onLessonSaved(payload: { kind: "Add" | "Edit", data: LessonItem }) {
  if (payload.kind === "Add") {
    courseLessons.value.forEach((chapter) => {
      if (chapter.chapterId === payload.data.chapterId) {
        chapter.lessons.push({ ...payload.data })
      }
    })
    refreshLessonCount()
  } else {
    courseLessons.value.forEach((chapter) => {
      if (chapter.chapterId === payload.data.chapterId) {
        chapter.lessons = chapter.lessons.map((lesson) => {
          if (lesson.lessonId === payload.data.lessonId) {
            return { ...payload.data }
          }
          return lesson
        })
      }
    })
  }
}

function deleteLesson(lesson: any) {
  ElMessageBox.confirm(`确定要删除课节 "${lesson.name}" 吗？`, "确认删除", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    // 确认删除的逻辑
    try {
      deleteLessonApi(lesson.lessonId).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          // 删除成功，从列表中移除该课节
          courseLessons.value = courseLessons.value.map((chapter) => {
            if (chapter.chapterId === lesson.chapterId) {
              return {
                ...chapter,
                lessons: chapter.lessons.filter(item => item.lessonId !== lesson.lessonId)
              }
            }
            return chapter
          })
          refreshLessonCount()
        }
      })
    } catch (error) {
      console.error("删除失败:", error)
    }
  }).catch(() => {
    // 取消删除的逻辑
  })
}

const attachmentModal = ref<InstanceType<typeof AttachmentModal>>()
const attachmentsModalFiles = ref<fileMeta[]>([])
function viewAttachments(files: fileMeta[]) {
  attachmentsModalFiles.value = files
  if (attachmentModal.value && typeof attachmentModal.value.open === "function") {
    attachmentModal.value.open()
  } else {
    console.error("无法调用 open 方法")
  }
}

// 吸顶效果相关
const tabsPlaceholderRef = ref<HTMLElement | null>(null)
const isSticky = ref(false)
const HEADER_HEIGHT = 60 // 顶部菜单栏高度,请根据实际情况调整

// 处理滚动事件
function handleScroll() {
  if (!tabsPlaceholderRef.value) return

  const rect = tabsPlaceholderRef.value.getBoundingClientRect()
  const offsetTop = rect.top

  // 当tabs-placeholder滚动到距离视口顶部 ≤ 60px 时,启用吸顶效果
  // 一旦吸顶后,无论继续向上或向下滚动都保持吸顶状态
  if (offsetTop <= HEADER_HEIGHT) {
    isSticky.value = true
  } else {
    isSticky.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  // 使用捕获阶段监听scroll事件
  window.addEventListener("scroll", handleScroll, true)
})

onBeforeUnmount(() => {
  // 清理事件监听器
  window.removeEventListener("scroll", handleScroll, true)
})
</script>

<template>
  <!-- 首次加载中状态 -->
  <div v-if="!initialized" v-loading="true" class="catalog-loading" />
  <!-- 加载完成后显示内容 -->
  <div v-else class="course-catalog">
    <div ref="tabsPlaceholderRef" class="tabs-placeholder" :class="{ 'is-sticky': isSticky }" />
    <div class="tabs-container" :class="{ 'is-sticky': isSticky && isSidebarOpened, 'is-sticky-fold': isSticky && !isSidebarOpened }">
      <!-- 章节标签 -->
      <el-tabs v-model="activeTabName" class="chapter-tabs" @tab-change="handleTabChange" type="card">
        <!-- 前10个可见章节 -->
        <el-tab-pane
          v-for="chapter in visibleChapters"
          :key="chapter.chapterId"
          :name="String(chapter.chapterId)"
        >
          <template #label>
            <el-tooltip :content="chapter.name" placement="top" effect="light">
              <span class="chapter-tab-name">{{ chapter.name }}</span>
            </el-tooltip>
          </template>
        </el-tab-pane>

        <!-- 剩余章节折叠 -->
        <el-tab-pane v-if="hasHiddenChapters" name="more">
          <template #label>
            <el-popover placement="bottom" :width="200" trigger="hover">
              <div class="hidden-chapters-list">
                <div
                  v-for="chapter in hiddenChapters"
                  :key="chapter.chapterId"
                  class="hidden-chapter-item"
                  @click="switchChapter(chapter)"
                >
                  {{ chapter.name }}
                </div>
              </div>
              <template #reference>
                <span class="more-tab">...</span>
              </template>
            </el-popover>
          </template>
        </el-tab-pane>

        <!-- 新增章节按钮 -->
        <el-tab-pane name="add-chapter">
          <template #label>
            <span class="add-chapter-tab" @click.stop="addChapter">+ 新增章节</span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 课程内容 -->
    <div v-loading="catalogLoading" class="course-content">
      <div
        v-for="(chapter) in courseLessons"
        :key="chapter.chapterId"
        :id="`chapter-${chapter.chapterId}`"
        class="chapter-item"
      >
        <!-- 章节标题 -->
        <div class="chapter-header">
          <div class="chapter-header-left">
            <span class="chapter-index" />
            <div class="chapter-title">
              <CustomText :content="chapter.name" />
            </div>
            <span class="chapter-lesson-count">（共{{ chapter.lessons.length }}节）</span>
            <div class="chapter-actions">
              <el-button type="primary" link size="small" @click="editChapter(chapter)" title="编辑">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="danger" link size="small" @click="deleteChapter(chapter)" title="删除">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="chapter-header-right">
            <el-button
              v-show="chapter.lessons.length"
              type="primary"
              link
              size="small"
              @click="toggleChapterCollapse(chapter.chapterId)"
            >
              {{ isChapterCollapsed(chapter.chapterId) ? '展开' : '收起' }}
              <el-icon>
                <component :is="isChapterCollapsed(chapter.chapterId) ? 'ArrowDown' : 'ArrowUp'" />
              </el-icon>
            </el-button>
          </div>
        </div>

        <!-- 课节列表 -->
        <div class="lessons-list" v-show="!isChapterCollapsed(chapter.chapterId)">
          <div
            v-for="(lesson) in chapter.lessons"
            :key="lesson.lessonId"
            class="lesson-item"
          >
            <!-- 类型图标 -->
            <div class="lesson-type-icon">
              <img :src="lessonIconVideo" v-if="lesson.lessonType === LessonType.Video" alt="">
              <img :src="lessonIconText" v-if="lesson.lessonType === LessonType.Text" alt="">
              <img :src="lessonIconLive" v-if="lesson.lessonType === LessonType.Live" alt="">
              <img :src="lessonIconDiscuss" v-if="lesson.lessonType === LessonType.Discuss" alt="">
              <img :src="lessonIconWork" v-if="lesson.lessonType === LessonType.Work" alt="">
            </div>

            <LessonDetail
              :lesson="lesson"
              :chapter="chapter"
              :is-class="classId !== null"
              @view-attachments="viewAttachments"
            />

            <!-- 操作按钮 -->
            <div class="lesson-actions">
              <span>
                <el-button type="primary" link size="small" @click="editLesson(lesson)">
                  编辑
                </el-button>
              </span>
              <span>
                <el-button type="danger" link size="small" @click="deleteLesson(lesson)">
                  删除
                </el-button>
              </span>
            </div>
          </div>
        </div>
        <!-- 新增小节按钮 -->

        <div class="add-lesson-btn" v-show="!isChapterCollapsed(chapter.chapterId)">
          <el-popover placement="bottom" :width="96" trigger="hover">
            <div class="menu-wrapper">
              <div class="lesson-type-menu">
                <div class="lesson-type-item" @click="addLesson(LessonType.Video, { chapterId: chapter.chapterId })">
                  <img :src="lessonVideoImg" class="lesson-type-icon1" alt="">录播视频
                </div>
                <div class="lesson-type-item" @click="addLesson(LessonType.Text, { chapterId: chapter.chapterId })">
                  <img :src="lessonTextImg" class="lesson-type-icon1" alt="">图文课
                </div>
                <div class="lesson-type-item" @click="addLesson(LessonType.Live, { chapterId: chapter.chapterId })">
                  <img :src="lessonLiveImg" class="lesson-type-icon1" alt="">直播课
                </div>
                <div class="lesson-type-item" @click="addLesson(LessonType.Discuss, { chapterId: chapter.chapterId })">
                  <img :src="lessonDiscussImg" class="lesson-type-icon1" alt="">讨论课
                </div>
                <div class="lesson-type-item" @click="addLesson(LessonType.Work, { chapterId: chapter.chapterId })">
                  <img :src="lessonWorkImg" class="lesson-type-icon1" alt="">作业任务
                </div>
              </div>
            </div>
            <template #reference>
              <el-button type="primary" link size="small">
                + 新增小节
              </el-button>
            </template>
          </el-popover>
        </div>
      </div>
    </div>
  </div>
  <div class="dialog-item">
    <el-dialog
      v-model="addChapterModal.visible"
      :title="addChapterModal.title"
      width="600px"
      @close="handleCancelChapter"
    >
      <el-form :model="chapterFormState" label-position="left">
        <el-form-item label="名称" required>
          <el-input v-model="chapterFormState.name" placeholder="请输入章节名称" :maxlength="100" show-word-limit clearable />
        </el-form-item>
        <!-- 隐藏课程ID -->
        <el-input v-model="chapterFormState.courseId" type="hidden" />
      </el-form>
      <template #footer>
        <el-button size="small" @click="handleCancelChapter">
          取消
        </el-button>
        <el-button size="small" type="primary" :loading="chapterSubmitting" @click="handleAddChapter">
          保存
        </el-button>
      </template>
    </el-dialog>
    <LessonForm
      ref="lessonFormRef"
      :course-id="props.courseId"
      :class-id="props.classId"
      :course-lessons="courseLessons"
      :teachers="teachers"
      :senior-teachers="seniorTeachers"
      @saved="onLessonSaved"
    />

    <AttachmentModal
      :files="attachmentsModalFiles || []"
      ref="attachmentModal"
    />
  </div>
</template>

<style scoped lang="scss">
.catalog-loading {
  min-height: 200px;
}

.course-catalog {
  padding: 0px;
}

.tabs-placeholder {
  // 占位元素,用于触发吸顶效果
  height: 0;
  pointer-events: none;
  &.is-sticky {
    height: calc(var(--v3-header-height) + 75px); // 吸顶时占位高度,请根据T顶部菜单栏高度 + abs的高度调整
  }
}

.tabs-container {
  background-color: #fff;
  transition: all 0.3s ease;
  z-index: 99;

  &.is-sticky {
    position: fixed;
    top: var(--v3-header-height); // 顶部菜单栏高度,请根据实际情况调整
    left: var(--v3-sidebar-width); // 侧边栏宽度,请根据实际情况调整
    right: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 20px 20px 0; // 添加左右内边距,与页面内容对齐
  }
  &.is-sticky-fold {
    position: fixed;
    top: var(--v3-header-height); // 顶部菜单栏高度,请根据实际情况调整
    left: var(--v3-sidebar-hide-width); // 侧边栏宽度,请根据实际情况调整
    right: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 20px 20px 0; // 添加左右内边距,与页面内容对齐
  }
}

.chapter-tabs {
  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    width: 120px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 400;
    line-height: 22px;
    color: #222;
  }

  :deep(.el-tabs__item.is-active) {
    color: #166fff;
    font-weight: 500;
  }

  :deep(.el-tabs__item:hover) {
    color: #166fff;
  }
}

.chapter-tab-name {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-tab {
  cursor: pointer;
  color: #606266;
  font-weight: bold;
  font-size: 16px;
}

.add-chapter-tab {
  color: #166fff;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}

.hidden-chapters-list {
  max-height: 300px;
  overflow-y: auto;
}

.hidden-chapter-item {
  padding: 8px 12px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background-color: #e4eeff;
    color: #166fff;
  }
}

.course-content {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.chapter-item {
  border-bottom: 1px solid #e4e7ed;
  padding: 16px 20px;
}

.chapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chapter-header-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0; // 允许子元素缩小
}

.chapter-header-right {
  display: flex;
  align-items: center;
  margin-left: 8px;
  flex-shrink: 0;
}

.chapter-index {
  width: 2px;
  height: 12px;
  background-color: #166fff;
  border-radius: 2px;
  flex-shrink: 0;
}

.chapter-title {
  font-size: 12px;
  font-weight: 500;
  color: #222222;
  flex: 0 1 auto; // 允许标题根据内容自适应，但可以收缩
  min-width: 0; // 允许收缩
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-lesson-count {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  margin-right: 4px;
  flex-shrink: 0; // 防止课节数量被压缩
  white-space: nowrap; // 确保在一行显示
}

.chapter-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chapter-actions .el-button {
  padding: 0;
  font-size: 14px;
}

.lesson-item {
  margin-top: 16px;
  display: flex;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  position: relative;
}

.lesson-type-icon {
  position: absolute; /* 绝对定位 */
  top: -8px;
  left: 0; /* 定位在左侧 */
  width: 60px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 4px;
  flex-shrink: 0;
  z-index: 1; /* 确保图标在内容之上 */
}

.lesson-actions {
  width: 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.add-lesson-btn {
  padding: 12px 0;
  display: flex;
  justify-content: space-between;
}

.add-lesson-btn button {
  padding: 8px 16px;
  font-size: 12px;
}

.lesson-type-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lesson-type-item {
  width: 100%;
  padding-left: 16px;
  height: 29px;
  border-radius: 2px;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: #222222;
}

.lesson-type-item:hover {
  background-color: #e4eeff;
  color: #166fff;
  cursor: pointer;
}

.lesson-type-icon1 {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.dialog-item {
  display: flex;
}

.radio-item {
  display: inline-flex;
  align-items: center;
  margin-right: 20px;
  width: 80px;
}

.radio-item .lesson-type-icon {
  width: 16px;
  height: 16px;
  margin-right: 5px;
  vertical-align: middle;
}
</style>
