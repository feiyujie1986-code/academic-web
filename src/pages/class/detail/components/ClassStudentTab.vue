<!-- src/pages/class/detail/components/ClassAmbassadorTeacherTab.vue -->
<script setup lang="ts">
import type { ClassUserModel } from "@/api/class/user"
import { formatDateTime } from "@@/utils/datetime"
import { ElMessage, ElMessageBox } from "element-plus"
import { onMounted, ref } from "vue"
import { bindClassUsersApi, getClassUsersApi } from "@/api/class/user"
import SelectUserModal from "../../components/SelectUserModal.vue"

// Props定义
interface Props {
  classId: number
}
const props = defineProps<Props>()
// Emits定义
const emit = defineEmits<{
  (e: "updateStudentCount", count: number): void
}>()

// 数据状态
const loading = ref(false)
const students = ref<ClassUserModel[]>([])

// 表单数据
const form = ref({
  selectedStudents: [] as ClassUserModel[]
})

// 获取用户数据
async function fetchUserData() {
  loading.value = true
  getClassUsersApi(props.classId, ["student", "class_monitor"])
    .then((res) => {
      if (res.code === 0) {
        students.value = res.data.map((item) => {
          return {
            ...item,
            joinDate: formatDateTime(item.joinTime * 1000)
          }
        })
        emit("updateStudentCount", res.data.length)
      } else {
        ElMessage.error(res.msg)
      }
    })
    .finally(() => {
      loading.value = false
    })
}

// 组件挂载时加载数据
onMounted(() => {
  if (props.classId) {
    fetchUserData()
  }
})

// 监听classId变化，当父组件传入新的classId时重新获取数据
watch(
  () => props.classId,
  (newClassId: number) => {
    if (newClassId) {
      fetchUserData()
    }
  }
)

// 添加学员（使用服务端分页模式，由 SelectUserModal 内部调用 API）
function handleAddStudent() {
  userSelectModal.value.userType = "student"
  userSelectModal.value.selectedIds = students.value.map(item => item.userId)
  userSelectModal.value.initialSelectedUsers = students.value.map(item => ({
    id: item.userId,
    nickname: item.nickname,
    email: item.email
  }))
  userSelectModal.value.visible = true
}
// 删除
function handleRemoveStudent(id: number) {
  ElMessageBox.confirm("确定要删除该学员吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      loading.value = true
      bindClassUsersApi({
        classId: props.classId,
        userIds: [id],
        userType: "student",
        operationType: "remove"
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage.success("删除成功")
            fetchUserData()
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

function handleAddClassMonitor() {
  if (!form.value.selectedStudents.length) {
    ElMessage.warning("请至少选择一位学员")
    return
  }
  if (form.value.selectedStudents.length > 1) {
    ElMessage.warning("只能选择一位学员做班长")
    return
  }
  // 当前班长
  const monitor = students.value.find(item => item.userType === "class_monitor")
  if (monitor?.userId === form.value.selectedStudents[0].userId) {
    ElMessage.warning("该用户已经是班长")
    return
  }
  let tip = `确定将【${form.value.selectedStudents[0].nickname}】设为班长吗？`
  if (monitor) {
    tip = `确定将【${form.value.selectedStudents[0].nickname}】设为班长, 并取消【${monitor.nickname}】的班长职位吗？`
  }
  ElMessageBox.confirm(
    `${tip}`,
    "提示",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    }
  )
    .then(() => {
      bindClassUsersApi({
        classId: props.classId,
        userIds: [form.value.selectedStudents[0].userId],
        userType: "class_monitor",
        operationType: "add"
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage.success("设置成功")
            fetchUserData()
          } else {
            ElMessage.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
          form.value.selectedStudents = []
        })
    })
    .catch(() => {})
  // 获取用户数据
  // console.log("获取用户数据")
}
// 批量删除大使
function handleBatchRemoveStudents() {
  if (!form.value.selectedStudents.length) {
    ElMessage.warning("请至少选择一位学员")
    return
  }

  ElMessageBox.confirm(
    `确定要删除选中的${form.value.selectedStudents.length}位学员吗？`,
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
        userIds: form.value.selectedStudents.map(item => item.userId),
        userType: "student",
        operationType: "remove"
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage.success("删除成功")
            fetchUserData()
          } else {
            ElMessage.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
          form.value.selectedStudents = []
        })
    })
    .catch(() => {})
}

// 定义人员数据模型
interface userDataModel {
  id: number
  nickname: string
  email: string
}
const userSelectModal = ref({
  title: "选择用户",
  visible: false,
  userList: [] as userDataModel[],
  selectedIds: [] as number[],
  initialSelectedUsers: [] as userDataModel[],
  userType: "student",
  minCount: 1,
  maxCount: 100
})
function handleUserSelectConfirm(selectUserIds: number[]) {
  // 添加用户
  try {
    // 过滤班长id
    const monitorId = students.value.find(item => item.userType === "class_monitor")?.userId
    const studentIds = selectUserIds.filter(item => item !== monitorId)
    bindClassUsersApi({
      classId: props.classId,
      userIds: studentIds,
      userType: userSelectModal.value.userType as "student",
      operationType: "add"
    })
      .then((res) => {
        if (res.code === 0) {
          ElMessage.success("添加成功")
          fetchUserData()
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
    <!-- 班级学生 -->
    <div class="section">
      <div class="section-header">
        <div /> <!-- 占位符 -->
        <div class="actions">
          <el-button type="primary" @click="handleAddStudent">
            + 新增学生
          </el-button>
          <el-button type="primary" @click="handleAddClassMonitor">
            + 任命班长
          </el-button>
          <el-button type="danger" @click="handleBatchRemoveStudents">
            批量删除
          </el-button>
        </div>
      </div>

      <div class="table-wrapper">
        <el-table
          :data="students"
          v-loading="loading"
          @selection-change="(val) => form.selectedStudents = val"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="id" label="序号" width="60">
            <template #default="scope">
              {{ scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="nickname" label="姓名" width="120">
            <template #default="scope">
              <span>{{ scope.row.nickname }}</span>
              <el-tag v-if="scope.row.userType === 'class_monitor'" type="primary" size="small" style="margin-left: 5px;">
                班长
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="email" label="邮箱" width="200" />
          <el-table-column prop="joinDate" label="加入班级日期" width="150" />
          <el-table-column prop="remark" label="备注" />
          <el-table-column label="操作" width="80">
            <template #default="scope">
              <el-button size="small" type="danger" link @click="handleRemoveStudent(scope.row.userId)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <!-- 弹窗组件（使用分组懒加载模式） -->
    <SelectUserModal
      v-model="userSelectModal.visible"
      :title="userSelectModal.title"
      :user-type="userSelectModal.userType"
      :selected-user-ids="userSelectModal.selectedIds"
      :initial-selected-users="userSelectModal.initialSelectedUsers"
      :min-select-count="userSelectModal.minCount"
      :max-select-count="userSelectModal.maxCount"
      :use-group-api="true"
      @confirm="handleUserSelectConfirm"
    />
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
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 15px;
  gap: 10px;
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
