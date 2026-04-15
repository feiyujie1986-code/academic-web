<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import { reactive, ref } from "vue"
import { addClassApi } from "@/api/class/class"
import { getTeachersApi } from "@/api/member/teacher"
import SelectUserModal from "../components/SelectUserModal.vue"

defineOptions({
  name: "ClassAdd"
})

const router = useRouter()
const loading = ref<boolean>(false)

// 定义人员数据模型
interface userDataModel {
  id: number
  nickname: string
  email?: string
}

// teacher data
const teacherOptions = ref<userDataModel[]>([])
async function getTeacherOption() {
  try {
    const res = await getTeachersApi({
      page: 1,
      pageSize: 999999
    })
    if (res.code === 0) {
      teacherOptions.value = res.data.list
    }
  } catch (error) {
    console.log(error)
  }
}
getTeacherOption()

// 表单相关
const formRef = ref<FormInstance>()
const formData = reactive({
  name: "",
  remark: "",
  startTime: 0,
  endTime: 0,
  rangeTime: [],
  teachers: [] as userDataModel[],
  students: [] as userDataModel[],
  classMonitors: [] as userDataModel[]
})

const formRules: FormRules = reactive({
  name: [{ required: true, trigger: "blur", message: "请输入班级名称" }],
  rangeTime: [{
    required: true,
    trigger: "change",
    validator: (_rule, value, callback) => {
      if (!value || value.length !== 2) {
        callback(new Error("请选择时间范围"))
      } else {
        callback()
      }
    }
  }]
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
      // 判断必填项
      if (formData.teachers.length === 0) {
        ElMessage.error("请选择教师")
        return
      }
      if (formData.students.length === 0) {
        ElMessage.error("请选择学生")
        return
      }
      if (formData.classMonitors.length === 0) {
        ElMessage.error("请选择班长")
        return
      }
      // 增加防止多次触发请求
      if (loading.value) {
        return
      }
      loading.value = true
      try {
        const res = await addClassApi({
          name: formData.name,
          remark: formData.remark,
          startTime: formData.rangeTime[0] / 1000,
          endTime: formData.rangeTime[1] / 1000 + 86399,
          teacherIds: formData.teachers.map(item => item.id),
          seniorTeacherIds: [],
          studentIds: formData.students
            .filter(student => !formData.classMonitors.some(monitor => monitor.id === student.id))
            .map(item => item.id),
          classMonitorIds: formData.classMonitors.map(item => item.id)
        })
        if (res.code === 0) {
          const classId = res.data.classId
          ElMessageBox.confirm(
            "小班创建成功，是否前往排课？",
            "提示",
            {
              confirmButtonText: "立即排课",
              cancelButtonText: "返回班级列表",
              type: "success",
              closeOnClickModal: false
            }
          ).then(() => {
            // 去排课：跳转到课程详情的课程目录标签
            router.push({
              name: "ClassDetail",
              params: {
                id: classId
              },
              query: {
                tab: "catalog"
              }
            })
          }).catch(() => {
            // 返回班级列表
            router.back()
          })
        }
      } finally {
        loading.value = false
      }
    }
  })
}

// 移除指定字段中的某项
function removeUserList(field: string, id: number) {
  if (field === "students") {
    formData.students = formData.students.filter(item => item.id !== id)
  } else if (field === "teachers") {
    formData.teachers = formData.teachers.filter(item => item.id !== id)
  } else if (field === "classMonitors") {
    formData.classMonitors = formData.classMonitors.filter(item => item.id !== id)
  }
}

const userSelectModal = ref({
  title: "选择用户",
  visible: false,
  userList: [] as userDataModel[],
  selectedIds: [] as number[],
  selectedUserList: [] as userDataModel[],
  initialSelectedUsers: [] as userDataModel[],
  userType: "teacher",
  minCount: 1,
  maxCount: 100,
  useGroupApi: false
})

// 打开选择弹窗
function openSelect(type: string) {
  if (type === "student") {
    // 学生选择使用分组懒加载 API
    userSelectModal.value.maxCount = 999
    userSelectModal.value.title = "选择学生"
    userSelectModal.value.selectedIds = formData.students.map(item => item.id)
    userSelectModal.value.selectedUserList = formData.students
    userSelectModal.value.initialSelectedUsers = formData.students
    userSelectModal.value.useGroupApi = true
  } else if (type === "teacher") {
    userSelectModal.value.maxCount = 999
    userSelectModal.value.title = "选择教师"
    userSelectModal.value.userList = teacherOptions.value
    userSelectModal.value.selectedIds = formData.teachers.map(item => item.id)
    userSelectModal.value.selectedUserList = formData.teachers
    userSelectModal.value.useGroupApi = false
  } else if (type === "classMonitor") {
    userSelectModal.value.maxCount = 1
    userSelectModal.value.title = "选择班长"
    userSelectModal.value.userList = formData.students
    userSelectModal.value.selectedIds = formData.classMonitors.map(item => item.id)
    userSelectModal.value.selectedUserList = formData.classMonitors
    userSelectModal.value.useGroupApi = false
  } else {
    ElMessage.warning("请选择正确的用户类型")
    return
  }
  userSelectModal.value.visible = true
  userSelectModal.value.userType = type
}

function handleUserSelectConfirm(selectUserIds: number[], selectedUsers?: userDataModel[]) {
  // 服务端模式下使用 selectedUsers，本地模式下从 userList 过滤
  const users = selectedUsers || userSelectModal.value.userList.filter(item => selectUserIds.includes(item.id))
  userSelectModal.value.selectedUserList = users

  if (userSelectModal.value.userType === "student") {
    formData.students = users
  } else if (userSelectModal.value.userType === "teacher") {
    formData.teachers = users
  } else if (userSelectModal.value.userType === "classMonitor") {
    formData.classMonitors = users
  }
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
        <!-- 班级名称 -->
        <el-form-item label="小班名称" prop="name">
          <el-input v-model="formData.name" autocomplete="off" placeholder="请输入小班名称" :maxlength="50" clearable show-word-limit />
        </el-form-item>

        <!-- 开课日期 -->
        <el-form-item label="开课日期" prop="rangeTime">
          <el-date-picker
            v-model="formData.rangeTime"
            type="daterange"
            range-separator="-"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="x"
            style="width: 300px;"
          />
        </el-form-item>

        <!-- 教师 -->
        <el-form-item label="教师" required>
          <el-button type="primary" size="small" plain @click="openSelect('teacher')">
            选择教师
          </el-button>
          <div class="selected-tags">
            <span
              v-for="item in formData.teachers"
              :key="item.id"
              class="tag-item"
            >
              {{ item.nickname }}
              <el-icon class="el-icon-close" @click="removeUserList('teachers', item.id)"><Close /></el-icon>
            </span>
          </div>
        </el-form-item>

        <!-- 学生 -->
        <el-form-item label="学生" required>
          <el-button type="primary" size="small" plain @click="openSelect('student')">
            选择学生
          </el-button>
          <div class="selected-tags">
            <span
              v-for="item in formData.students"
              :key="item.id"
              class="tag-item"
            >
              {{ item.nickname }}
              <el-icon class="el-icon-close" @click="removeUserList('students', item.id)"><Close /></el-icon>
            </span>
          </div>
        </el-form-item>

        <!-- 班长 -->
        <el-form-item label="班长" required>
          <el-button type="primary" size="small" plain @click="openSelect('classMonitor')">
            选择班长
          </el-button>
          <div class="selected-tags">
            <span
              v-for="item in formData.classMonitors"
              :key="item.id"
              class="tag-item"
            >
              {{ item.nickname }}
              <el-icon class="el-icon-close" @click="removeUserList('classMonitors', item.id)"><Close /></el-icon>
            </span>
          </div>
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            :maxlength="500"
            show-word-limit
            placeholder="请输入备注"
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

    <!-- 弹窗组件 -->
    <SelectUserModal
      v-model="userSelectModal.visible"
      :title="userSelectModal.title"
      :user-type="userSelectModal.userType"
      :selected-user-ids="userSelectModal.selectedIds"
      :user-list="userSelectModal.userList"
      :initial-selected-users="userSelectModal.initialSelectedUsers"
      :min-select-count="userSelectModal.minCount"
      :max-select-count="userSelectModal.maxCount"
      :use-group-api="userSelectModal.useGroupApi"
      @confirm="handleUserSelectConfirm"
    />
  </div>
</template>

<style scoped>
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: 8px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  background: #eef2f7;
  color: #409eff;
  padding: 6px 6px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #dcdfe6;
  height: 28px;
}

.tag-item .el-icon-close {
  margin-left: 4px;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
  transition: color 0.2s ease;
}

.form-item-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: #e6a23c;
}
</style>
