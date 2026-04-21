<script lang="ts" setup>
import type { ClassUserModel } from "@/api/class/user"
import type { OrganizationModel } from "@/api/organization/organization"
import { formatDate, formatDateTime } from "@@/utils/datetime"
import { ElMessage } from "element-plus"
import { onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { editClassBaseInfoApi, getClassInfoApi } from "@/api/class/class"
import { getClassUsersApi } from "@/api/class/user"
import { getOrganizationsApi } from "@/api/organization/organization"
import ClassCourseTab from "./components/ClassCourseTab.vue"
import ClassMaterialsTab from "./components/ClassMaterialsTab.vue"
import ClassStudentTab from "./components/ClassStudentTab.vue"
import ClassTeacherTab from "./components/ClassTeacherTab.vue"

// 获取路由参数
const route = useRoute()
const _router = useRouter()
const classId = ref<number>(0)
const pageLoading = ref(false)
const classInfo = reactive({
  classId: 0,
  name: "",
  startTime: 0,
  endTime: 0,
  startDate: "",
  endDate: "",
  remark: "",
  seniorTeacherCount: 0,
  teacherCount: 0,
  studentCount: 0,
  organizationId: undefined as number | undefined,
  organizationName: ""
})

// 机构列表
const organizationList = ref<OrganizationModel[]>([])

// 大使列表
const seniorTeachers = ref<ClassUserModel[]>([])

// 获取大使姓名列表（用于展示）
const seniorTeacherNames = computed(() => {
  return seniorTeachers.value.map(t => t.nickname).join("、") || "-"
})

async function getOrganizationList() {
  try {
    const res = await getOrganizationsApi({ page: 1, pageSize: 10000 })
    if (res.code === 0) {
      organizationList.value = res.data.list
    }
  } catch {
    // 错误已由 axios 拦截器处理
  }
}

// 获取班级大使列表
async function fetchSeniorTeachers() {
  if (!classId.value) return
  try {
    const res = await getClassUsersApi(classId.value, ["senior_teacher"])
    if (res.code === 0) {
      seniorTeachers.value = res.data
    }
  } catch {
    // 错误已由 axios 拦截器处理
  }
}

// 页面加载时获取班级ID
onMounted(() => {
  getOrganizationList()
  if (route.params.id) {
    classId.value = Number(route.params.id)
    // 获取班级详细信息
    fetchClassDetail()
    // 获取班级大使列表
    fetchSeniorTeachers()
  }
})

// 获取班级详细信息
async function fetchClassDetail() {
  pageLoading.value = true
  try {
    const res = await getClassInfoApi(classId.value)
    if (res.code === 0) {
      classInfo.classId = res.data.classId
      classInfo.name = res.data.name
      classInfo.startTime = res.data.startTime
      classInfo.endTime = res.data.endTime
      classInfo.startDate = formatDate(formatDateTime(res.data.startTime * 1000))
      classInfo.endDate = formatDate(formatDateTime(res.data.endTime * 1000))
      classInfo.remark = res.data.remark
      classInfo.seniorTeacherCount = res.data.seniorTeacherCount
      classInfo.teacherCount = res.data.teacherCount
      classInfo.studentCount = res.data.studentCount
      classInfo.organizationId = res.data.organizationId || undefined
      classInfo.organizationName = res.data.organizationName || ""
    }
  } catch (error) {
    ElMessage.error("获取班级信息失败")
    console.log(error)
  } finally {
    pageLoading.value = false
  }
}

// tab切换处理
const activeTab = ref("course")
// 已加载的 Tab 集合，用于懒加载
const loadedTabs = ref<Set<string>>(new Set(["course"])) // 默认加载课程 Tab

// 监听 Tab 切换，记录已访问的 Tab
watch(activeTab, (newTab: string) => {
  if (!loadedTabs.value.has(newTab)) {
    loadedTabs.value.add(newTab)
  }
})

// 修改班级基础信息相关变量
const editDialogVisible = ref(false)
const editForm = reactive({
  className: "",
  startTime: 0,
  endTime: 0,
  rangeTime: ["", ""] as [string, string],
  organizationId: undefined as number | undefined,
  remark: ""
})
const editRules = ref({
  className: [
    { required: true, message: "请输入班级名称", trigger: "blur" },
    { min: 1, max: 50, message: "长度在 1 到 50 个字符", trigger: "blur" }
  ],
  remark: [
    { max: 500, message: "备注不能超过500个字符", trigger: "blur" }
  ]
})

// 弹出编辑对话框
function openEditDialog() {
  editForm.className = classInfo.name
  editForm.startTime = classInfo.startTime * 1000
  editForm.endTime = classInfo.endTime * 1000
  editForm.rangeTime[0] = formatDateTime(classInfo.startTime * 1000)
  editForm.rangeTime[1] = formatDateTime(classInfo.endTime * 1000)
  editForm.organizationId = classInfo.organizationId
  editForm.remark = classInfo.remark
  editDialogVisible.value = true
}

// 取消编辑
function cancelEdit() {
  editDialogVisible.value = false
}

// 确认编辑
async function confirmEdit() {
  try {
    // 调用修改基础信息接口（时间戳为毫秒），机构创建后不可修改故不传 organizationId
    const res = await editClassBaseInfoApi(classId.value, {
      name: editForm.className,
      startTime: new Date(editForm.rangeTime[0]).getTime(),
      endTime: new Date(editForm.rangeTime[1]).getTime(),
      remark: editForm.remark,
      organizationId: editForm.organizationId
    })
    if (res.code === 0) {
      // 使用接口返回的数据更新本地状态
      classInfo.name = res.data.name
      classInfo.remark = res.data.remark
      classInfo.startTime = res.data.startTime
      classInfo.endTime = res.data.endTime
      classInfo.startDate = formatDate(formatDateTime(res.data.startTime))
      classInfo.endDate = formatDate(formatDateTime(res.data.endTime))
      classInfo.organizationId = res.data.organizationId || undefined
      classInfo.organizationName = res.data.organizationName || ""
    }
  } catch (error) {
    ElMessage.error("修改班级信息失败")
    console.log(error)
  }
  editDialogVisible.value = false
}
// 删除班级处理
// async function handleDelete() {
//   ElMessageBox.confirm("此操作将永久删除该班级, 是否继续?", "提示", {
//     confirmButtonText: "确定",
//     cancelButtonText: "取消",
//     type: "warning"
//   })
//     .then(() => {
//       deleteClassApi({ id: classId.value }).then((res) => {
//         if (res.code === 0) {
//           ElMessage({ type: "success", message: res.msg })
//           // 跳转到班级列表页面
//           router.push({ path: "/class/list" })
//         }
//       })
//     })
//     .catch(() => {})
// };

function handleUpdateTeacherCount(count: number) {
  classInfo.teacherCount = count
}
function handleUpdateStudentCount(count: number) {
  classInfo.studentCount = count
}

// 用户数据更新标识，用于通知 ClassCourseTab 刷新教师/大使数据
const usersUpdatedKey = ref(0)
function handleUsersUpdated() {
  usersUpdatedKey.value++
  // 刷新大使列表
  fetchSeniorTeachers()
}
</script>

<template>
  <div v-loading="pageLoading" class="app-container">
    <!-- 班级基本信息区域 -->
    <el-card shadow="never" class="class-info-card">
      <div class="class-header">
        <div class="class-name">
          {{ route.params.id ? classInfo.name : "加载中..." }}
        </div>
        <div class="class-actions">
          <el-button type="primary" link size="small" @click="openEditDialog">
            <el-icon class="el-icon--left">
              <Edit />
            </el-icon>修改基础信息
          </el-button>
        </div>
      </div>

      <div class="class-details">
        <!-- 合并显示开课时间、大使数、教师数、学员数 -->
        <div class="info-row">
          <span class="info-item">
            <span class="label">开课时间：</span>
            <span class="value">{{ classInfo.startDate }} - {{ classInfo.endDate }}</span>
          </span>
          <span class="info-item">
            <span class="label">大使：</span>
            <el-tooltip
              v-if="seniorTeachers.length > 0"
              :content="seniorTeacherNames"
              placement="top"
              :disabled="seniorTeachers.length <= 3"
            >
              <span class="value ambassador-names">
                {{ seniorTeachers.length > 3
                  ? `${seniorTeachers.slice(0, 3).map(t => t.nickname).join("、")}...`
                  : seniorTeacherNames
                }}
                <span class="count-badge">({{ classInfo.seniorTeacherCount }})</span>
              </span>
            </el-tooltip>
            <span v-else class="value">-</span>
          </span>
          <span class="info-item">
            <span class="label">教师数：</span>
            <span class="value">{{ classInfo.teacherCount }}</span>
          </span>
          <span class="info-item">
            <span class="label">学员数：</span>
            <span class="value">{{ classInfo.studentCount }}</span>
          </span>
          <span class="info-item">
            <span class="label">机构：</span>
            <el-tooltip
              v-if="classInfo.organizationName && classInfo.organizationName.length > 12"
              :content="classInfo.organizationName"
              placement="top"
            >
              <span class="value organization-name">{{ classInfo.organizationName }}</span>
            </el-tooltip>
            <span v-else class="value">{{ classInfo.organizationName || '' }}</span>
          </span>
        </div>
        <div class="info-row">
          <!-- 单独显示备注 -->
          <span class="info-item">
            <span class="label">备注：</span>
            <span class="value">{{ classInfo?.remark }}</span>
          </span>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="class-tabs-card">
      <!-- tab标签页 -->
      <el-tabs v-model="activeTab" class="class-tabs">
        <el-tab-pane label="班级课程" name="course">
          <ClassCourseTab v-if="loadedTabs.has('course') && classId > 0" :class-id="classId" :users-updated-key="usersUpdatedKey" />
        </el-tab-pane>
        <el-tab-pane label="班级教师" name="teacher">
          <ClassTeacherTab
            v-if="loadedTabs.has('teacher')"
            :class-id="classId"
            @update-teacher-count="handleUpdateTeacherCount"
            @users-updated="handleUsersUpdated"
          />
        </el-tab-pane>
        <el-tab-pane label="班级学生" name="student">
          <ClassStudentTab
            v-if="loadedTabs.has('student')"
            :class-id="classId"
            @update-student-count="handleUpdateStudentCount"
          />
        </el-tab-pane>
        <el-tab-pane label="教学资料" name="materials">
          <ClassMaterialsTab
            v-if="loadedTabs.has('materials')"
            :class-id="classId"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 修改班级基础信息模态框 -->
    <el-dialog
      title="修改班级基础信息"
      v-model="editDialogVisible"
      width="50%"
    >
      <el-form
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item label="班级名称：" prop="className">
          <el-input v-model="editForm.className" placeholder="请输入班级名称" required :maxlength="100" show-word-limit clearable />
        </el-form-item>

        <!-- 开课日期 -->
        <el-form-item label="开课日期" prop="startTime">
          <!-- <div> -->
          <el-date-picker
            v-model="editForm.rangeTime"
            type="daterange"
            range-separator="→"
            start-placeholder="Start date"
            end-placeholder="End date"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 300px;"
          />
          <!-- </div> -->
          <!-- <span style="margin: 0 10px;">→</span>
          <el-date-picker
            v-model="editForm.endTime"
            type="datetime"
            placeholder="结束时间"
            style="width: 200px;"
            value-format="x"
          /> -->
        </el-form-item>

        <el-form-item label="备注：" prop="remark">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            :maxlength="500"
            show-word-limit
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelEdit">取消</el-button>
          <el-button type="primary" @click="confirmEdit">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.class-info-card {
  margin-bottom: 12px;
}

.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.class-name {
  font-size: 14px;
  font-weight: 400;
  line-height: 24px;
  color: #222;
}

.class-actions {
  display: flex;
}
:deep(.plain-btn-danger) {
  color: var(--el-color-danger-dark-2);
  &:hover {
    color: var(--el-color-danger-dark-2);
  }
}

/* 信息行样式 */
.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-bottom: 8px;
}

.info-row:last-of-type {
  margin-bottom: 0px;
}

.info-item {
  display: flex;
  flex-direction: row;
  min-width: 120px;
  align-items: center;
}

.info-item span {
  font-size: 12px;
  font-weight: 400;
  line-height: 24px;
  color: #666666;
}

.info-item .label {
  margin-right: 4px;
}

.organization-name {
  display: inline-block;
  max-width: 12em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.ambassador-names {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 20em;
  cursor: default;
}

.count-badge {
  color: #909399;
  font-size: 12px;
}

.form-item-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
