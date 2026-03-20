<script setup lang="ts">
import type { ClassAuthorizedDocument } from "@/api/class/class"
import type { DocumentResponse } from "@/api/document/document"
import fileExcelIcon from "@@/assets/images/file-excel-icon.png"
import fileFolderIcon from "@@/assets/images/file-file-icon.png"
import fileImgIcon from "@@/assets/images/file-img-icon.png"
import fileMp3Icon from "@@/assets/images/file-mp3-icon.png"
import fileMp4Icon from "@@/assets/images/file-mp4-icon.png"
import filePdfIcon from "@@/assets/images/file-pdf-icon.png"
import filePptIcon from "@@/assets/images/file-ppt-icon.png"
import fileTextIcon from "@@/assets/images/file-text-icon.png"
import fileWordIcon from "@@/assets/images/file-word-icon.png"
import { ElMessage } from "element-plus"
import { computed, onMounted, ref } from "vue"
import { getClassAuthorizedDocumentsApi } from "@/api/class/class"
import { getDocuments } from "@/api/document/document"

// Props定义
interface Props {
  classId: number
}
const props = defineProps<Props>()

// 视图模式：authorized-授权资料列表 / folder-文件夹内容
const viewMode = ref<"authorized" | "folder">("authorized")
const folderPath = ref<{ id: number, name: string }[]>([])

// 数据状态
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 授权资料列表（根视图）
const materialList = ref<ClassAuthorizedDocument[]>([])
// 文件夹内容列表
const folderContentList = ref<DocumentResponse[]>([])

// 当前显示的列表数据（统一格式）
interface DisplayItem {
  id: number
  name: string
  type: 1 | 2
  typeName: string
  fileSize?: number
  createdByName?: string
  createdAt: number
  // 原始数据引用
  _raw: ClassAuthorizedDocument | DocumentResponse
}

const displayList = computed<DisplayItem[]>(() => {
  if (viewMode.value === "authorized") {
    return materialList.value.map(item => ({
      id: item.document.id,
      name: item.document.name,
      type: item.document.type,
      typeName: item.document.typeName,
      fileSize: item.document.file?.size,
      createdByName: item.createdByName,
      createdAt: item.createdAt,
      _raw: item
    }))
  } else {
    return folderContentList.value.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      typeName: item.typeName,
      fileSize: item.file?.size,
      createdByName: undefined,
      createdAt: item.createdAt,
      _raw: item
    }))
  }
})

// 获取授权资料列表
async function fetchAuthorizedMaterials() {
  if (!props.classId) return

  loading.value = true
  try {
    const res = await getClassAuthorizedDocumentsApi(props.classId, {
      page: currentPage.value,
      pageSize: pageSize.value
    })
    if (res.code === 0) {
      materialList.value = res.data.list
      total.value = res.data.total
    } else {
      ElMessage.error(res.msg || "获取教学资料失败")
    }
  } catch {
    ElMessage.error("获取教学资料失败")
  } finally {
    loading.value = false
  }
}

// 获取文件夹内容
async function fetchFolderContent(parentId: number) {
  loading.value = true
  try {
    const res = await getDocuments({
      page: currentPage.value,
      pageSize: pageSize.value,
      parentId
    })
    if (res.code === 0) {
      folderContentList.value = res.data.list
      total.value = res.data.total
    } else {
      ElMessage.error(res.msg || "获取文件夹内容失败")
    }
  } catch {
    ElMessage.error("获取文件夹内容失败")
  } finally {
    loading.value = false
  }
}

// 统一的数据获取函数
function fetchData() {
  if (viewMode.value === "authorized") {
    fetchAuthorizedMaterials()
  } else {
    const currentFolder = folderPath.value[folderPath.value.length - 1]
    if (currentFolder) {
      fetchFolderContent(currentFolder.id)
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  if (props.classId) {
    fetchData()
  }
})

// 监听classId变化
watch(
  () => props.classId,
  (newClassId: number) => {
    if (newClassId) {
      // 重置到授权资料视图
      viewMode.value = "authorized"
      folderPath.value = []
      currentPage.value = 1
      fetchData()
    }
  }
)

// 分页变化
function handlePageChange(page: number) {
  currentPage.value = page
  fetchData()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  fetchData()
}

// 点击文件夹进入
function handleFolderClick(item: DisplayItem) {
  if (item.type !== 1) return // 只处理文件夹

  // 切换到文件夹视图
  viewMode.value = "folder"
  folderPath.value.push({ id: item.id, name: item.name })
  currentPage.value = 1
  fetchFolderContent(item.id)
}

// 面包屑点击 - 返回授权资料列表
function handleBackToAuthorized() {
  viewMode.value = "authorized"
  folderPath.value = []
  currentPage.value = 1
  fetchAuthorizedMaterials()
}

// 面包屑点击 - 返回指定层级
function handleBreadcrumbClick(index: number) {
  if (index < 0) {
    // 点击"授权资料"
    handleBackToAuthorized()
    return
  }

  // 点击中间层级
  folderPath.value = folderPath.value.slice(0, index + 1)
  currentPage.value = 1
  const targetFolder = folderPath.value[index]
  fetchFolderContent(targetFolder.id)
}

// 格式化时间（时间戳为秒）
function formatTime(timestamp: number): string {
  if (!timestamp) return "-"
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

// 格式化文件大小
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "-"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// 获取文件 PNG 图标
function getFilePngIcon(item: DisplayItem): string | null {
  if (item.type === 1) return fileFolderIcon
  const ext = item.name.split(".").pop()?.toLowerCase() || ""
  if (["xls", "xlsx", "csv"].includes(ext)) return fileExcelIcon
  if (["doc", "docx"].includes(ext)) return fileWordIcon
  if (["ppt", "pptx"].includes(ext)) return filePptIcon
  if (ext === "pdf") return filePdfIcon
  if (["txt", "rtf"].includes(ext)) return fileTextIcon
  if (["mp3", "wav", "m4a"].includes(ext)) return fileMp3Icon
  if (["mp4", "avi", "mov", "mkv", "flv", "wmv", "webm", "m4v"].includes(ext)) return fileMp4Icon
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return fileImgIcon
  return null
}
</script>

<template>
  <div class="tab-content">
    <div class="section">
      <!-- 面包屑导航 -->
      <div v-if="folderPath.length > 0" class="breadcrumb-nav">
        <span
          class="breadcrumb-item is-link"
          @click="handleBackToAuthorized"
        >
          授权资料
        </span>
        <template v-for="(item, index) in folderPath" :key="item.id">
          <span class="breadcrumb-separator">/</span>
          <span
            class="breadcrumb-item"
            :class="{ 'is-link': index < folderPath.length - 1 }"
            @click="index < folderPath.length - 1 && handleBreadcrumbClick(index)"
          >
            {{ item.name }}
          </span>
        </template>
      </div>

      <!-- 表格 -->
      <div class="table-wrapper">
        <el-table
          v-loading="loading"
          :data="displayList"
          row-key="id"
        >
          <el-table-column prop="id" label="序号" width="60">
            <template #default="scope">
              {{ (currentPage - 1) * pageSize + scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column label="资料名称" min-width="250">
            <template #default="{ row }">
              <div
                class="file-name-cell"
                :class="{ 'is-folder': row.type === 1 }"
                @click="row.type === 1 && handleFolderClick(row)"
              >
                <div class="file-icon-wrapper">
                  <img v-if="getFilePngIcon(row)" :src="getFilePngIcon(row)!" class="file-png-icon">
                </div>
                <span class="file-name" :title="row.name">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              {{ row.typeName }}
            </template>
          </el-table-column>
          <el-table-column label="文件大小" width="120">
            <template #default="{ row }">
              {{ row.type === 2 ? formatFileSize(row.fileSize) : '-' }}
            </template>
          </el-table-column>
          <!-- 授权人列 - 仅在授权资料视图显示 -->
          <el-table-column v-if="viewMode === 'authorized'" label="授权人" width="120">
            <template #default="{ row }">
              {{ row.createdByName || '-' }}
            </template>
          </el-table-column>
          <!-- 时间列 - 授权资料显示授权时间，文件夹内显示创建时间 -->
          <el-table-column :label="viewMode === 'authorized' ? '授权时间' : '创建时间'" width="180">
            <template #default="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination-area">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          background
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && displayList.length === 0" class="empty-state">
        <el-empty :description="viewMode === 'authorized' ? '暂无教学资料' : '文件夹为空'" />
      </div>
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

.breadcrumb-nav {
  margin-bottom: 16px;
  padding: 12px 0;
  font-size: 14px;
  color: #606266;
}

.breadcrumb-item {
  &.is-link {
    color: #409eff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

.breadcrumb-separator {
  margin: 0 8px;
  color: #909399;
}

.table-wrapper {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;

  &.is-folder {
    cursor: pointer;

    &:hover .file-name {
      color: #409eff;
    }
  }
}

.file-icon-wrapper {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-png-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
  transition: color 0.2s;
}

.pagination-area {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 12px 0;
}

.empty-state {
  padding: 40px 0;
}
</style>
