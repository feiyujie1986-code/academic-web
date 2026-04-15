<!-- src/pages/class/detail/components/ClassAmbassadorTeacherTab.vue -->
<script setup lang="ts">
import type { ClassUserModel } from "@/api/class/user"
import { formatDateTime } from "@@/utils/datetime"
import { ElMessage, ElMessageBox } from "element-plus"
import { onMounted, ref } from "vue"
import { bindClassUsersApi, getClassUsersApi } from "@/api/class/user"
import { getTeachersApi as getSeniorTeachersApi } from "@/api/member/seniorTeacher"
import { getTeachersApi } from "@/api/member/teacher"
import SelectUserModal from "../../components/SelectUserModal.vue"

// Props定义
interface Props {
  classId: number
}
const props = defineProps<Props>()
// Emits定义
const emit = defineEmits<{
  (e: "updateSeniorTeacherCount", count: number): void
  (e: "updateTeacherCount", count: number): void
  (e: "usersUpdated"): void
}>()

// 组件挂载时加载数据
onMounted(() => {
  if (props.classId) {
    fetchUserData("senior_teacher")
    fetchUserData("teacher")
  }
})

// 监听classId变化，当父组件传入新的classId时重新获取数据
watch(
  () => props.classId,
  (newClassId: number) => {
    if (newClassId) {
      fetchUserData("senior_teacher")
      fetchUserData("teacher")
    }
  }
)

// 数据状态
const loading = ref(false)
const addAmbassadorLoading = ref(false)
const addTeacherLoading = ref(false)
const ambassadors = ref<ClassUserModel[]>([])
const teachers = ref<ClassUserModel[]>([])

// 表单数据
const form = ref({
  selectedAmbassadors: [] as ClassUserModel[],
  selectedTeachers: [] as ClassUserModel[]
})

// 获取用户数据
async function fetchUserData(userType: string) {
  loading.value = true
  getClassUsersApi(props.classId, [userType])
    .then((res) => {
      if (res.code === 0) {
        if (userType === "senior_teacher") {
          ambassadors.value = res.data.map((item) => {
            return {
              ...item,
              joinDate: formatDateTime(item.joinTime * 1000)
            }
          })
          emit("updateSeniorTeacherCount", res.data.length)
        } else if (userType === "teacher") {
          teachers.value = res.data.map((item) => {
            return {
              ...item,
              joinDate: formatDateTime(item.joinTime * 1000)
            }
          })
          emit("updateTeacherCount", res.data.length)
        }
      } else {
        ElMessage.error(res.msg)
      }
    })
    .finally(() => {
      loading.value = false
    })
}

// 添加大使
function handleAddAmbassador() {
  // 获取用户数据
  addAmbassadorLoading.value = true
  getSeniorTeachersApi({
    page: 1,
    pageSize: 999999
  })
    .then((res) => {
      if (res.code === 0) {
        userSelectModal.value.userList = res.data.list
        userSelectModal.value.userType = "senior_teacher"
        userSelectModal.value.selectedIds = ambassadors.value.map(item => item.userId)
        // 打开选择模态框
        userSelectModal.value.visible = true
      }
    })
    .catch((error) => {
      console.log(error)
    })
    .finally(() => {
      addAmbassadorLoading.value = false
    })
}

// 添加教师
function handleAddTeacher() {
  // 获取用户数据
  addTeacherLoading.value = true
  getTeachersApi({
    page: 1,
    pageSize: 999999
  })
    .then((res) => {
      if (res.code === 0) {
        userSelectModal.value.userList = res.data.list
        userSelectModal.value.userType = "teacher"
        userSelectModal.value.selectedIds = teachers.value.map(item => item.userId)
        // 打开选择模态框
        userSelectModal.value.visible = true
      }
    })
    .catch((error) => {
      console.log(error)
    })
    .finally(() => {
      addTeacherLoading.value = false
    })
}

// 删除大使
function handleRemoveAmbassador(id: number) {
  ElMessageBox.confirm("确定要删除该大使吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      loading.value = true
      bindClassUsersApi({
        classId: props.classId,
        userIds: [id],
        userType: "senior_teacher",
        operationType: "remove"
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage.success("删除成功")
            fetchUserData("senior_teacher")
            emit("updateSeniorTeacherCount", ambassadors.value.length - 1)
            emit("usersUpdated") // 通知父组件用户数据已更新
          } else {
            ElMessage.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
        })
    })
    .catch(() => {})
}

// 删除教师
function handleRemoveTeacher(id: number) {
  ElMessageBox.confirm("确定要删除该教师吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      loading.value = true
      bindClassUsersApi({
        classId: props.classId,
        userIds: [id],
        userType: "teacher",
        operationType: "remove"
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage.success("删除成功")
            fetchUserData("teacher")
            emit("updateTeacherCount", teachers.value.length - 1)
            emit("usersUpdated") // 通知父组件用户数据已更新
          } else {
            ElMessage.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
        })
    })
    .catch(() => {})
}

// 批量删除大使
function handleBatchRemoveAmbassadors() {
  if (!form.value.selectedAmbassadors.length) {
    ElMessage.warning("请至少选择一位大使")
    return
  }

  ElMessageBox.confirm(
    `确定要删除选中的${form.value.selectedAmbassadors.length}位大使吗？`,
    "提示",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    }
  )
    .then(() => {
      loading.value = true
      bindClassUsersApi({
        classId: props.classId,
        userIds: form.value.selectedAmbassadors.map(item => item.userId),
        userType: "senior_teacher",
        operationType: "remove"
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage.success("删除成功")
            fetchUserData("senior_teacher")
            emit("updateSeniorTeacherCount", ambassadors.value.length - form.value.selectedAmbassadors.length)
            emit("usersUpdated") // 通知父组件用户数据已更新
          } else {
            ElMessage.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
          form.value.selectedAmbassadors = []
        })
    })
    .catch(() => {})
}

// 批量删除教师
function handleBatchRemoveTeachers() {
  if (!form.value.selectedTeachers.length) {
    ElMessage.warning("请至少选择一位教师")
    return
  }

  ElMessageBox.confirm(
    `确定要删除选中的${form.value.selectedTeachers.length}位教师吗？`,
    "提示",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    }
  )
    .then(() => {
      loading.value = true
      bindClassUsersApi({
        classId: props.classId,
        userIds: form.value.selectedTeachers.map(item => item.userId),
        userType: "teacher",
        operationType: "remove"
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage.success("删除成功")
            fetchUserData("teacher")
            emit("usersUpdated") // 通知父组件用户数据已更新
          } else {
            ElMessage.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
          form.value.selectedTeachers = []
        })
    })
    .catch(() => {})
}
// 定义人员数据模型
interface userDataModel {
  id: number
  nickname: string
  email?: string
}
const userSelectModal = ref({
  title: "选择用户",
  visible: false,
  userList: [] as userDataModel[],
  selectedIds: [] as number[],
  selectedUserList: [] as userDataModel[],
  userType: "teacher",
  minCount: 1,
  maxCount: 100
})
function handleUserSelectConfirm(selectUserIds: number[]) {
  // 添加用户
  try {
    bindClassUsersApi({
      classId: props.classId,
      userIds: selectUserIds,
      userType: userSelectModal.value.userType as "teacher" | "senior_teacher",
      operationType: "add"
    })
      .then((res) => {
        if (res.code === 0) {
          ElMessage.success("添加成功")
          fetchUserData(userSelectModal.value.userType)
          emit("usersUpdated") // 通知父组件用户数据已更新
        }
      })
  } catch (error) {
    ElMessage.error("添加失败")
    console.log(error)
  }
}
</script>

<template>
  <div class="tab-content">
    <!-- 班级大使 -->
    <div class="section">
      <div class="section-header">
        <h3>班级大使</h3>
        <div class="actions">
          <el-button type="primary" :loading="addAmbassadorLoading" @click="handleAddAmbassador">
            + 新增大使
          </el-button>
          <el-button type="danger" @click="handleBatchRemoveAmbassadors">
            批量删除
          </el-button>
        </div>
      </div>

      <div class="table-wrapper">
        <el-table
          :data="ambassadors"
          v-loading="loading"
          @selection-change="(val) => form.selectedAmbassadors = val"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="id" label="序号" width="60">
            <template #default="scope">
              {{ scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="nickname" label="姓名" width="120" />
          <el-table-column prop="email" label="邮箱" width="200" />
          <el-table-column prop="joinDate" label="加入班级日期" width="150" />
          <el-table-column prop="remark" label="备注" />
          <el-table-column label="操作" width="80">
            <template #default="scope">
              <el-button size="small" type="danger" link @click="handleRemoveAmbassador(scope.row.userId)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 班级教师 -->
    <div class="section">
      <div class="section-header">
        <h3>班级教师</h3>
        <div class="actions">
          <el-button type="primary" :loading="addTeacherLoading" @click="handleAddTeacher">
            + 新增教师
          </el-button>
          <el-button type="danger" @click="handleBatchRemoveTeachers">
            批量删除
          </el-button>
        </div>
      </div>

      <div class="table-wrapper">
        <el-table
          :data="teachers"
          v-loading="loading"
          @selection-change="(val) => form.selectedTeachers = val"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="id" label="序号" width="60">
            <template #default="scope">
              {{ scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="nickname" label="姓名" width="120" />
          <el-table-column prop="email" label="邮箱" width="200" />
          <el-table-column prop="joinDate" label="加入班级日期" width="150" />
          <el-table-column prop="remark" label="备注" />
          <el-table-column label="操作" width="80">
            <template #default="scope">
              <el-button size="small" type="danger" link @click="handleRemoveTeacher(scope.row.userId)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <!-- 弹窗组件 -->
      <SelectUserModal
        v-model="userSelectModal.visible"
        :title="userSelectModal.title"
        :user-type="userSelectModal.userType"
        :selected-user-ids="userSelectModal.selectedIds"
        :user-list="userSelectModal.userList"
        :min-select-count="userSelectModal.minCount"
        :max-select-count="userSelectModal.maxCount"
        @confirm="handleUserSelectConfirm"
      />
    </div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 0 20px;
}

.section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.actions {
  display: flex;
  gap: 10px;
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

.el-table .el-button--text {
  color: #f56c6c;
  font-size: 12px;
}

.el-table .el-button--text:hover {
  color: #d33a3a;
}

.el-table .el-button--text:focus {
  color: #d33a3a;
}

/* 选中行样式 */
.el-table .el-table__row--highlight {
  background-color: #f5f7fa;
}

/* 分页样式 */
.el-pagination {
  text-align: right;
  margin-top: 20px;
}
</style>
