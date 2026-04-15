<script lang="ts" setup>
import type { classListItem } from "@/api/class/class"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { reactive, ref } from "vue"
import {
  deleteClassApi,
  getClasssApi
} from "@/api/class/class"
import { getStudentsApi } from "@/api/member/student"
import { getTeachersApi } from "@/api/member/teacher"
import CustomText from "@/common/components/CustomText/index.vue"

defineOptions({
  name: "Class"
})

const router = useRouter()

const loading = ref<boolean>(false)
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

// 搜索表单数据
const searchFormData = reactive({
  name: "",
  teacherId: undefined as number | undefined,
  studentId: undefined as number | undefined
})

// 处理搜索
function handleSearch() {
  paginationData.currentPage = 1
  paginationData.pageSize = 10
  // console.log(searchFormData)
  getTableData()
}

// 重置搜索
function resetSearch() {
  searchFormData.name = ""
  searchFormData.teacherId = undefined
  searchFormData.studentId = undefined
}
// 定义人员数据模型
interface userDataModel {
  id: number
  nickname: string
  email?: string
}

// teacher data
const teacherOptions = ref<userDataModel[]>([])
// 获得teacher data
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

// student data
const studentOptions = ref<userDataModel[]>([])
async function getStudentOption() {
  try {
    const res = await getStudentsApi({
      page: 1,
      pageSize: 999999
    })
    if (res.code === 0) {
      studentOptions.value = res.data.list
    }
  } catch (error) {
    console.log(error)
  }
}
getStudentOption()

// 表格数据
const tableData = ref<classListItem[]>([])
// let activeRow: classListItem

// 获取表格数据
async function getTableData() {
  loading.value = true
  try {
    const teacherIds = ref<number[]>([])
    const studnetIds = ref<number[]>([])
    if (searchFormData.teacherId) {
      teacherIds.value.push(searchFormData.teacherId)
    }
    if (searchFormData.studentId) {
      studnetIds.value.push(searchFormData.studentId)
    }
    const res = await getClasssApi({
      teacherIds: teacherIds.value,
      seniorTeacherIds: [],
      studentIds: studnetIds.value,
      name: searchFormData.name,
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    })
    if (res.code === 0) {
      tableData.value = res.data.list.map((item) => {
        item.createdDate = formatDateTime(item.createdAt * 1000, "YYYY-MM-DD")
        return item
      })
      paginationData.total = res.data.total
    }
  } catch (error) {
    console.log(error)
  }
  loading.value = false
}
getTableData()

// 跳转到新增班级页面
function goToAddClass() {
  router.push({ name: "ClassAdd" })
}

// 删除课程
function deleteClassAction(row: classListItem) {
  ElMessageBox.confirm("此操作将永久删除该小班, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      deleteClassApi(row.classId).then((res) => {
        if (res.code === 0) {
          ElMessage({ type: "success", message: res.msg })
          getTableData()
        }
      })
    })
    .catch(() => {})
}

// 分页处理
function handleSizeChange(value: number) {
  changePageSize(value)
  getTableData()
}

function handleCurrentChange(value: number) {
  changeCurrentPage(value)
  getTableData()
}

// 排课功能
function scheduleClass(row: classListItem) {
  // 跳转到课程详情的课程目录标签
  router.push({
    name: "ClassDetail",
    params: {
      id: row.classId
    },
    query: {
      tab: "catalog" // 指定要激活的标签页为课程目录
    }
  })
}
</script>

<template>
  <div class="app-container">
    <el-card v-loading="loading" shadow="never">
      <div class="toolbar-wrapper">
        <el-form :inline="true" :model="searchFormData">
          <el-form-item prop="name" label="班级名称">
            <el-input v-model="searchFormData.name" placeholder="请输入班级名称" clearable style="width: 150px" />
          </el-form-item>
          <el-form-item prop="teacherId" label="教师">
            <el-select v-model="searchFormData.teacherId" placeholder="请选择教师" clearable filterable style="width: 120px">
              <el-option
                v-for="item in teacherOptions"
                :key="item.id"
                :label="item.nickname"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="studentId" label="学员">
            <el-select v-model="searchFormData.studentId" placeholder="请选择学员" clearable filterable style="width: 120px">
              <el-option
                v-for="item in studentOptions"
                :key="item.id"
                :label="item.nickname"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleSearch">
              查询
            </el-button>
            <el-button icon="Refresh" @click="resetSearch">
              重置
            </el-button>
          </el-form-item>
        </el-form>
        <div class="operate-wrapper">
          <el-button type="primary" icon="Plus" @click="goToAddClass">
            新增小班
          </el-button>
        </div>
      </div>
      <div class="table-wrapper">
        <el-table :data="tableData" header-cell-class-name="class-list-header">
          <!-- <el-table-column prop="classId" label="ID" /> -->
          <!--  <el-table-column type="selection" width="40" /> -->
          <el-table-column label="小班名称">
            <template #default="scope">
              <el-button link type="primary" class="class-name-btn" @click="scheduleClass(scope.row)">
                {{ scope.row.name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="seniorTeacherCount" label="大使数" width="80" />
          <el-table-column prop="teacherCount" label="教师数" width="80" />
          <el-table-column prop="studentCount" label="学员数" width="80" />
          <el-table-column prop="organizationName" label="机构" width="150" />
          <el-table-column prop="createdDate" label="创建日期" width="120" />
          <el-table-column label="备注">
            <template #default="scope">
              <CustomText :content="scope.row.remark" :line-clamp="1" />
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" align="center" width="180">
            <template #default="scope">
              <el-button type="primary" text size="small" @click="scheduleClass(scope.row)">
                排课
              </el-button>
              <el-button type="danger" text size="small" @click="deleteClassAction(scope.row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pager-wrapper">
        <el-pagination
          background
          :layout="paginationData.layout"
          :page-sizes="paginationData.pageSizes"
          :total="paginationData.total"
          :page-size="paginationData.pageSize"
          :current-page="paginationData.currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
:deep(.el-table th.class-list-header) {
  background-color: #f6f7fb;
}

.class-name-btn {
  max-width: 100%;
}

.class-name-btn :deep(span) {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
