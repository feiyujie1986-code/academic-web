<script lang="ts" setup>
import type { categoryDataModel } from "@/api/course/category"
import type { courseListItem } from "@/api/course/course"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { ref } from "vue"
import { getCategoriesApi } from "@/api/course/category"
import {
  deleteCourseApi,
  getCoursesApi
} from "@/api/course/course"

defineOptions({
  name: "Course"
})

const router = useRouter()

const loading = ref<boolean>(false)
const { paginationData, changeCurrentPage, changePageSize } = usePagination()

// 搜索表单数据
const searchFormData = reactive({
  categoryId: undefined as number | undefined
})

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

// 处理搜索
function handleSearch() {
  paginationData.currentPage = 1
  paginationData.pageSize = 10
  getTableData()
}

// 重置搜索
function resetSearch() {
  searchFormData.categoryId = undefined
}

// 表格数据
const tableData = ref<courseListItem[]>([])

// 获取表格数据
async function getTableData() {
  loading.value = true
  try {
    const res = await getCoursesApi({
      categoryId: searchFormData.categoryId,
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    })
    if (res.code === 0) {
      tableData.value = res.data.list.map((item) => {
        return {
          ...item,
          createdDate: formatDateTime(item.createdAt * 1000)
        }
      })
      paginationData.total = res.data.total
    }
  } catch (error) {
    console.log(error)
  }
  loading.value = false
}
getTableData()

// 新增模板跳转到新页面
function addDialog() {
  router.push({ name: "CourseAdd" })
}

// 删除课程
function deleteCourseAction(row: courseListItem) {
  ElMessageBox.confirm("此操作将永久删除该课程, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      deleteCourseApi(row.courseId).then((res) => {
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

// 编辑跳转到新页面
function editDialog(row: courseListItem) {
  try {
    window.sessionStorage.setItem("courseData", JSON.stringify(row))
  } catch (error) {
    console.log("sessionStorage存储课程数据失败", error)
  }
  router.push({
    name: "CourseEdit",
    params: {
      id: row.courseId
    }
  })
}

// 排课功能
function scheduleCourse(row: courseListItem) {
  // 跳转到课程详情的课程目录标签
  router.push({
    name: "CourseDetail",
    params: {
      id: row.courseId
    },
    query: {
      tab: "catalog" // 指定要激活的标签页为课程目录
    }
  })
}
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" class="search-wrapper">
      <div class="toolbar-wrapper">
        <el-form :inline="true" :model="searchFormData">
          <el-form-item prop="categoryId" label="分类">
            <el-select v-model="searchFormData.categoryId" placeholder="请选择分类" clearable style="width: 150px">
              <el-option
                v-for="item in categoryOptions"
                :key="item.categoryId"
                :label="item.name"
                :value="item.categoryId"
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
        <el-button type="primary" icon="Plus" @click="addDialog">
          新增模板
        </el-button>
      </div>
      <div class="table-wrapper">
        <el-table :data="tableData" v-loading="loading">
          <!-- <el-table-column prop="courseId" label="ID" /> -->
          <el-table-column prop="name" label="课程模板名称">
            <template #default="scope">
              <el-button link type="primary" class="course-name-btn" @click="scheduleCourse(scope.row)">
                {{ scope.row.name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="categoryName" label="分类" />
          <el-table-column prop="lessonCount" label="课节数" />
          <el-table-column prop="createdByName" label="创建人" />
          <el-table-column prop="createdDate" label="创建日期" />
          <el-table-column fixed="right" label="操作" align="center" width="240">
            <template #default="scope">
              <el-button type="primary" text icon="Edit" size="small" @click="editDialog(scope.row)">
                编辑
              </el-button>
              <el-button type="primary" text icon="Collection" size="small" @click="scheduleCourse(scope.row)">
                排课
              </el-button>
              <el-button
                type="danger"
                text
                icon="Delete"
                size="small"
                @click="deleteCourseAction(scope.row)"
              >
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
.course-name-btn {
  max-width: 100%;
}

.course-name-btn :deep(span) {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
