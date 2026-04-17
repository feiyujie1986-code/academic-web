<script lang="ts" setup>
import type { ClassAuthorizationItem, LeaderAuthorizationItem, OrgAuthorizationItem, UserAuthorizationItem } from "@/api/document/authorization"
import type { DocumentResponse, DocumentTreeNode } from "@/api/document/document"
import fileExcelIcon from "@@/assets/images/file-excel-icon.png"
import fileFolderIcon from "@@/assets/images/file-file-icon.png"
import fileImgIcon from "@@/assets/images/file-img-icon.png"
import fileMp3Icon from "@@/assets/images/file-mp3-icon.png"
import fileMp4Icon from "@@/assets/images/file-mp4-icon.png"
import filePdfIcon from "@@/assets/images/file-pdf-icon.png"
import filePptIcon from "@@/assets/images/file-ppt-icon.png"
import fileTextIcon from "@@/assets/images/file-text-icon.png"
import fileWordIcon from "@@/assets/images/file-word-icon.png"
import { nextTick, onMounted, ref } from "vue"
import {
  addAuthorization,
  batchCancelAuthorization,
  getClassAuthorizations,
  getLeaderAuthorizations,
  getOrgAuthorizations,
  getUserAuthorizations
} from "@/api/document/authorization"
import {
  checkDuplicates,
  createFileRecord,
  createFolder,
  deleteDocument,
  getDocuments,
  getFolderTree,
  updateDocument
} from "@/api/document/document"
import { getOrganizationsApi } from "@/api/organization/organization"
import { useCloudUpload } from "@/composables/useCloudUpload"

// ==================== 文件分类映射 ====================

const categoryByExtension: Record<string, string[]> = {
  document: ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf", "txt", "rtf", "odt"],
  media: ["mp3", "mp4", "wav", "avi", "mov", "mkv", "flv", "wmv", "webm", "m4a", "m4v"],
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "tiff"]
}

// 支持上传的文件格式
const SUPPORTED_EXTENSIONS = ["xlsx", "xls", "csv", "txt", "mp3", "docx", "doc", "mp4", "mov", "pdf", "jpg", "png", "jpeg"]
const SUPPORTED_ACCEPT = ".xlsx,.xls,.csv,.txt,.mp3,.docx,.doc,.mp4,.mov,.pdf,.jpg,.png,.jpeg"

// 检查文件格式是否支持
function isFileSupported(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  return SUPPORTED_EXTENSIONS.includes(ext)
}

function getFileCategory(filename: string): "folder" | "document" | "media" | "image" {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  for (const [category, extensions] of Object.entries(categoryByExtension)) {
    if (extensions.includes(ext)) {
      return category as "document" | "media" | "image"
    }
  }
  return "document"
}

// 获取文件 PNG 图标
function getFilePngIcon(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
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

// 获取文件图标 SVG 名称
function getFileIconSvgName(item: DocumentResponse): string {
  if (item.type === 1) return ""
  const ext = item.name.split(".").pop()?.toLowerCase() || ""
  if (["doc", "docx"].includes(ext)) return "file-word"
  if (["xls", "xlsx", "csv"].includes(ext)) return "file-excel"
  if (["ppt", "pptx"].includes(ext)) return "file-ppt"
  if (ext === "pdf") return "file-pdf"
  if (["txt", "rtf"].includes(ext)) return "file-txt"
  if (["mp3", "wav", "m4a"].includes(ext)) return "file-mp3"
  if (["mp4", "avi", "mov", "mkv", "flv", "wmv", "webm", "m4v"].includes(ext)) return "file-video"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "file-img"
  return "file-file"
}

// ==================== 状态 ====================

// 筛选
const activeTab = ref<string>("all")
const searchKeyword = ref<string>("")

// 列表数据
const documentList = ref<DocumentResponse[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 文件夹导航
const currentParentId = ref(0)
const folderPath = ref<{ id: number, name: string }[]>([{ id: 0, name: "全部文件" }])

// 选择
const selectedRows = ref<DocumentResponse[]>([])

// 对话框状态
const uploadDialogVisible = ref(false)
const moveDialogVisible = ref(false)
const permissionDialogVisible = ref(false)

// 行内新建文件夹
const isCreatingFolder = ref(false)
const isSubmittingFolder = ref(false)
const newFolderName = ref("")
const newFolderInputRef = ref<HTMLInputElement | null>(null)

// 行内重命名
const renamingDocId = ref<number | null>(null)
const renamingName = ref("")
const renamingExt = ref("") // 保存扩展名
const isSubmittingRename = ref(false)
const renameInputRef = ref<HTMLInputElement | null>(null)

// 授权弹窗状态
type AuthTargetType = "seniorTeacher" | "teacher" | "student" | "newUser" | "orgStaff" | "orgLeader" | "internal" | "class" | "org"
const authActiveTab = ref<AuthTargetType>("seniorTeacher") // 默认大使
const authUserList = ref<UserAuthorizationItem[]>([]) // 人员授权列表
const authLoading = ref(false)
const authKeyword = ref("")
const authStatusFilter = ref<"" | "authorized" | "unauthorized">("")
const authNameFilter = ref("") // 名称筛选
const authNameOptions = ref<{ userId: number, nickname: string }[]>([]) // 名称筛选下拉选项
const authNameFilterLoading = ref(false)
const authPage = ref(1)
const authPageSize = ref(20)
const authTotal = ref(0)
const authSelectedRows = ref<UserAuthorizationItem[]>([])
const authTableRef = ref<InstanceType<typeof import("element-plus")["ElTable"]> | null>(null)

// 班级授权状态
const classAuthList = ref<ClassAuthorizationItem[]>([])
const classAuthLoading = ref(false)
const classAuthStatusFilter = ref<"" | "authorized" | "unauthorized">("")
const classAuthNameFilter = ref("") // 班级名称筛选
const classAuthNameOptions = ref<{ classId: number, className: string }[]>([]) // 班级名称下拉选项
const classAuthNameFilterLoading = ref(false)
const classAuthPage = ref(1)
const classAuthPageSize = ref(20)
const classAuthTotal = ref(0)
const classAuthSelectedRows = ref<ClassAuthorizationItem[]>([])
const classAuthTableRef = ref<InstanceType<typeof import("element-plus")["ElTable"]> | null>(null)

// 小组授权状态
const orgAuthList = ref<OrgAuthorizationItem[]>([])
const orgAuthLoading = ref(false)
const orgAuthStatusFilter = ref<"" | "authorized" | "unauthorized">("")
const orgAuthOrgId = ref<number | undefined>(undefined) // 选择小组筛选
const orgAuthOrgOptions = ref<{ id: number, name: string }[]>([]) // 小组下拉选项
const orgAuthOrgLoading = ref(false)
const orgAuthPage = ref(1)
const orgAuthPageSize = ref(20)
const orgAuthTotal = ref(0)
const orgAuthSelectedRows = ref<OrgAuthorizationItem[]>([])
const orgAuthTableRef = ref<InstanceType<typeof import("element-plus")["ElTable"]> | null>(null)

// 组长授权状态
const leaderAuthList = ref<LeaderAuthorizationItem[]>([])
const leaderAuthLoading = ref(false)
const leaderAuthStatusFilter = ref<"" | "authorized" | "unauthorized">("")
const leaderAuthKeyword = ref("")
const leaderAuthPage = ref(1)
const leaderAuthPageSize = ref(20)
const leaderAuthTotal = ref(0)
const leaderAuthSelectedRows = ref<LeaderAuthorizationItem[]>([])

// 当前操作的文件
const currentDocument = ref<DocumentResponse | null>(null)

// 移动目标
const folderTree = ref<DocumentTreeNode[]>([])
const selectedTargetFolderId = ref<number | null>(null)
const folderTreeLoading = ref(false)
const moveConfirmLoading = ref(false)

// 上传相关 - 多文件上传
interface UploadFileItem {
  id: string
  file: File
  name: string
  size: number
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  errorMsg?: string
  // 重名处理：选择文件时检测到重名后记录用户决策
  conflictAction?: "skip" | "replace" | "keep"
  existingDocId?: number // 重名文件的已存在文档ID，用于替换
}

const uploadFileList = ref<UploadFileItem[]>([])
const isUploading = ref(false)
const uploadComplete = ref(false) // 上传完成状态，用于显示100%进度
const currentUploadIndex = ref(-1)
const uploadRef = ref<InstanceType<typeof import("element-plus")["ElUpload"]> | null>(null)

// 重名处理相关 - 批量处理
const duplicateDialogVisible = ref(false)
const duplicateFiles = ref<UploadFileItem[]>([]) // 有重名的文件列表
const duplicateResolveCallback = ref<(() => void) | null>(null)
const checkingDuplicates = ref(false) // 正在检测重名

// 生成唯一ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// 格式化文件大小（用于上传列表显示）
function formatUploadFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

// 获取上传文件的 SVG 图标名称
function getUploadFileIconSvgName(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  if (["doc", "docx"].includes(ext)) return "file-word"
  if (["xls", "xlsx", "csv"].includes(ext)) return "file-excel"
  if (["ppt", "pptx"].includes(ext)) return "file-ppt"
  if (ext === "pdf") return "file-pdf"
  if (["txt", "rtf"].includes(ext)) return "file-txt"
  if (["mp3", "wav", "m4a"].includes(ext)) return "file-mp3"
  if (["mp4", "avi", "mov", "mkv", "flv", "wmv", "webm", "m4v"].includes(ext)) return "file-video"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "file-img"
  return "file-file"
}

// 云存储直传
const {
  status: cloudUploadStatus,
  upload: startCloudUpload,
  cancel: cancelCloudUpload,
  reset: resetCloudUpload
} = useCloudUpload({
  onSuccess: async (result) => {
    try {
      await createFileRecord({
        fileId: result.id,
        parentId: currentParentId.value,
        onConflict: "rename"
      })
      // 标记当前文件上传成功
      if (currentUploadIndex.value >= 0 && uploadFileList.value[currentUploadIndex.value]) {
        uploadFileList.value[currentUploadIndex.value].status = "success"
        uploadFileList.value[currentUploadIndex.value].progress = 100
      }
      // 继续上传下一个文件
      await uploadNextFile()
    } catch {
      if (currentUploadIndex.value >= 0 && uploadFileList.value[currentUploadIndex.value]) {
        uploadFileList.value[currentUploadIndex.value].status = "error"
        uploadFileList.value[currentUploadIndex.value].errorMsg = "创建文件记录失败"
      }
      await uploadNextFile()
    } finally {
      resetCloudUpload()
    }
  },
  onProgress: (progress: number) => {
    // 更新当前文件的进度
    if (currentUploadIndex.value >= 0 && uploadFileList.value[currentUploadIndex.value]) {
      uploadFileList.value[currentUploadIndex.value].progress = progress
    }
  }
})

// ==================== 计算属性 ====================

const filteredList = computed(() => {
  let list = documentList.value
  if (activeTab.value !== "all") {
    // 按类型筛选时，不显示文件夹（无法判断文件夹内是否包含该类型文件）
    list = list.filter((item) => {
      if (item.type === 1) return false // 文件夹不显示
      const category = getFileCategory(item.name)
      return category === activeTab.value
    })
  }
  return list
})

// 表格数据（包含新建文件夹行）
const tableData = computed(() => {
  if (isCreatingFolder.value) {
    // 添加虚拟的新建文件夹行
    const newFolderRow = {
      id: -1,
      name: "",
      type: 1,
      typeName: "文件夹",
      parentId: currentParentId.value,
      createdAt: Math.floor(Date.now() / 1000),
      isNewFolder: true
    } as DocumentResponse & { isNewFolder: boolean }
    return [newFolderRow, ...filteredList.value]
  }
  return filteredList.value
})

// 表格列标题
const tableColumnLabel = computed(() => {
  return folderPath.value.length > 1 ? folderPath.value[folderPath.value.length - 1].name : "全部文件"
})

// 按文件大小排序（文件夹不参与排序）
function sortByFileSize(a: DocumentResponse, b: DocumentResponse) {
  // 文件夹不参与排序，保持原位置
  if (a.type === 1 || b.type === 1) return 0
  // 都是文件，按大小排序
  const sizeA = a.file?.size ?? 0
  const sizeB = b.file?.size ?? 0
  return sizeA - sizeB
}

// 按上传时间排序（文件夹排最前）
function sortByCreatedAt(a: DocumentResponse, b: DocumentResponse) {
  // 文件夹始终排在前面
  if (a.type === 1 && b.type !== 1) return -1
  if (a.type !== 1 && b.type === 1) return 1
  // 按创建时间排序
  return (a.createdAt ?? 0) - (b.createdAt ?? 0)
}

// ==================== API 调用 ====================

async function fetchDocuments() {
  loading.value = true
  try {
    const res = await getDocuments({
      page: currentPage.value,
      pageSize: pageSize.value,
      parentId: currentParentId.value, // 始终传递 parentId，根目录传 0
      keyword: searchKeyword.value || undefined
    })
    if (res.code === 0) {
      documentList.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error("获取资料列表失败")
  } finally {
    loading.value = false
  }
}

async function fetchFolderTree() {
  folderTreeLoading.value = true
  try {
    const res = await getFolderTree()
    if (res.code === 0) {
      folderTree.value = [
        { id: 0, name: "根目录", type: 1, typeName: "文件夹", children: res.data }
      ]
    }
  } catch {
    ElMessage.error("获取文件夹树失败")
  } finally {
    folderTreeLoading.value = false
  }
}

// ==================== 事件处理 ====================

function handleTabChange(tab: string) {
  activeTab.value = tab
  currentPage.value = 1
}

function handleSearch() {
  currentPage.value = 1
  fetchDocuments()
}

function handleReset() {
  searchKeyword.value = ""
  activeTab.value = "all"
  currentPage.value = 1
  fetchDocuments()
}

function handleSelectionChange(rows: DocumentResponse[]) {
  selectedRows.value = rows
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchDocuments()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  fetchDocuments()
}

// 进入文件夹
function handleRowClick(row: DocumentResponse) {
  if (row.type === 1) {
    currentParentId.value = row.id
    folderPath.value.push({ id: row.id, name: row.name })
    currentPage.value = 1
    fetchDocuments()
  }
}

// 面包屑导航
function handleBreadcrumbClick(index: number) {
  const target = folderPath.value[index]
  currentParentId.value = target.id
  folderPath.value = folderPath.value.slice(0, index + 1)
  currentPage.value = 1
  fetchDocuments()
}

// ==================== 上传 ====================

// 上传统计计算属性
const uploadStats = computed(() => {
  const total = uploadFileList.value.length
  const success = uploadFileList.value.filter(f => f.status === "success").length
  const error = uploadFileList.value.filter(f => f.status === "error").length
  const pending = uploadFileList.value.filter(f => f.status === "pending").length
  const uploading = uploadFileList.value.filter(f => f.status === "uploading").length
  return { total, success, error, pending, uploading }
})

function handleUpload() {
  uploadFileList.value = []
  isUploading.value = false
  currentUploadIndex.value = -1
  uploadDialogVisible.value = true
  // 清空 el-upload 组件内部的文件列表
  nextTick(() => {
    uploadRef.value?.clearFiles()
  })
}

// 处理文件选择（支持多文件）
function handleUploadChange(uploadFile: any) {
  // 只处理当前新增的文件，避免 el-upload 内部状态导致重复添加
  if (!uploadFile || !uploadFile.raw) return

  // 检查文件格式是否支持
  if (!isFileSupported(uploadFile.name)) {
    ElMessage.warning(`不支持的文件格式：${uploadFile.name}`)
    return
  }

  // 检查是否已存在相同文件（按名称和大小判断）
  const isDuplicate = uploadFileList.value.some(
    existing => existing.name === uploadFile.name && existing.size === uploadFile.size
  )
  if (isDuplicate) return

  // 添加到上传列表
  const newFile: UploadFileItem = {
    id: generateId(),
    file: uploadFile.raw,
    name: uploadFile.name,
    size: uploadFile.size,
    status: "pending",
    progress: 0
  }
  uploadFileList.value.push(newFile)
}

// 批量检测文件重名
async function checkAllDuplicates(): Promise<boolean> {
  const pendingFiles = uploadFileList.value.filter(f => f.status === "pending" && !f.conflictAction)
  if (pendingFiles.length === 0) return true

  try {
    checkingDuplicates.value = true
    const res = await checkDuplicates({
      parentId: currentParentId.value,
      names: pendingFiles.map(f => ({ name: f.name, type: 2 as const }))
    })

    if (res.code === 0 && res.data.duplicates.length > 0) {
      // 找出所有重名的文件
      const duplicateNames = new Map(res.data.duplicates.map(d => [d.name, d.id]))
      const foundDuplicates: UploadFileItem[] = []

      for (const file of pendingFiles) {
        if (duplicateNames.has(file.name)) {
          file.existingDocId = duplicateNames.get(file.name)
          foundDuplicates.push(file)
        }
      }

      if (foundDuplicates.length > 0) {
        // 显示弹窗让用户选择处理方式
        duplicateFiles.value = foundDuplicates
        await showBatchDuplicateDialog()
      }
    }
    return true
  } catch {
    // 检测失败时继续上传
    return true
  } finally {
    checkingDuplicates.value = false
  }
}

// 显示批量重名弹窗并等待用户确认
function showBatchDuplicateDialog(): Promise<void> {
  return new Promise((resolve) => {
    duplicateResolveCallback.value = resolve
    duplicateDialogVisible.value = true
  })
}

// 重名处理：保留两者（对所有重名文件统一处理）
function handleDuplicateKeep() {
  for (const file of duplicateFiles.value) {
    // 直接在 uploadFileList 中找到对应的文件并修改，确保引用正确
    const target = uploadFileList.value.find(f => f.id === file.id)
    if (target) {
      target.conflictAction = "keep"
    }
  }
  closeDuplicateDialog()
}

// 重名处理：停止（移除所有重名文件）
function handleDuplicateSkip() {
  for (const file of duplicateFiles.value) {
    const index = uploadFileList.value.findIndex(item => item.id === file.id)
    if (index > -1) {
      uploadFileList.value.splice(index, 1)
    }
  }
  closeDuplicateDialog()
}

// 重名处理：替换（对所有重名文件统一处理）
function handleDuplicateReplace() {
  for (const file of duplicateFiles.value) {
    // 直接在 uploadFileList 中找到对应的文件并修改，确保引用正确
    const target = uploadFileList.value.find(f => f.id === file.id)
    if (target) {
      target.conflictAction = "replace"
      target.existingDocId = file.existingDocId
    }
  }
  closeDuplicateDialog()
}

// 关闭重名对话框
function closeDuplicateDialog() {
  duplicateDialogVisible.value = false
  duplicateFiles.value = []
  if (duplicateResolveCallback.value) {
    duplicateResolveCallback.value()
    duplicateResolveCallback.value = null
  }
}

// 移除单个文件
function removeUploadFile(id: string) {
  const index = uploadFileList.value.findIndex(f => f.id === id)
  if (index > -1) {
    uploadFileList.value.splice(index, 1)
  }
}

// 重试上传失败的文件
function retryUploadFile(id: string) {
  const file = uploadFileList.value.find(f => f.id === id)
  if (file) {
    file.status = "pending"
    file.progress = 0
    file.errorMsg = undefined
    // 如果当前没有在上传，开始上传
    if (!isUploading.value) {
      startUploadQueue()
    }
  }
}

// 开始上传队列
async function startUploadQueue() {
  if (uploadFileList.value.length === 0) {
    ElMessage.warning("请选择文件")
    return
  }

  // 先批量检测重名
  await checkAllDuplicates()

  // 检测后可能所有文件都被移除了（用户选择停止）
  if (uploadFileList.value.length === 0) {
    return
  }

  isUploading.value = true
  currentUploadIndex.value = -1
  await uploadNextFile()
}

// 上传下一个文件
async function uploadNextFile() {
  // 找到下一个待上传的文件
  const nextIndex = uploadFileList.value.findIndex(f => f.status === "pending")

  if (nextIndex === -1) {
    // 所有文件上传完成
    isUploading.value = false
    currentUploadIndex.value = -1

    const { success, error, total } = uploadStats.value
    if (error === 0) {
      // 标记上传完成，显示100%进度
      uploadComplete.value = true
      ElMessage.success(`全部 ${total} 个文件上传成功`)
      // 延迟关闭弹窗，让用户看到100%进度
      setTimeout(() => {
        uploadDialogVisible.value = false
        uploadFileList.value = []
        uploadComplete.value = false
      }, 800)
    } else {
      ElMessage.warning(`上传完成：${success} 成功，${error} 失败`)
    }
    await fetchDocuments()
    return
  }

  currentUploadIndex.value = nextIndex
  const fileItem = uploadFileList.value[nextIndex]

  // 根据预记录的冲突处理方式执行
  if (fileItem.conflictAction === "replace" && fileItem.existingDocId) {
    // 替换：先上传文件，然后更新已有文档的 fileId
    fileItem.status = "uploading"
    fileItem.progress = 0
    await uploadSingleFileWithReplace(fileItem, fileItem.existingDocId)
    return
  }

  // 正常上传（包括 keep 和无冲突的文件）
  fileItem.status = "uploading"
  fileItem.progress = 0
  await uploadSingleFile(fileItem)
}

// 上传文件并替换已有文档（使用云存储直传）
async function uploadSingleFileWithReplace(fileItem: UploadFileItem, existingDocId: number) {
  try {
    const { upload: startReplaceUpload } = useCloudUpload({
      onSuccess: async (result) => {
        try {
          // 更新已有文档的 fileId
          await updateDocument(existingDocId, { fileId: result.id })
          fileItem.status = "success"
          fileItem.progress = 100
        } catch {
          fileItem.status = "error"
          fileItem.errorMsg = "替换文件失败"
        }
        await uploadNextFile()
      },
      onProgress: (progress: number) => {
        fileItem.progress = progress
      }
    })
    await startReplaceUpload(fileItem.file)
  } catch {
    fileItem.status = "error"
    fileItem.errorMsg = "替换文件失败"
    await uploadNextFile()
  }
}

// 上传单个文件（使用云存储直传）
async function uploadSingleFile(fileItem: UploadFileItem) {
  try {
    // 使用云存储直传
    await startCloudUpload(fileItem.file)
    // 上传的成功/失败在 useCloudUpload 回调中处理
  } catch {
    fileItem.status = "error"
    fileItem.errorMsg = "上传失败"
    await uploadNextFile()
  }
}

// 取消上传
function handleCancelUpload() {
  if (cloudUploadStatus.value !== "idle") {
    cancelCloudUpload()
  }
  isUploading.value = false
  currentUploadIndex.value = -1
  uploadDialogVisible.value = false
  uploadFileList.value = []
}

// 清空已完成的文件
function clearCompletedFiles() {
  uploadFileList.value = uploadFileList.value.filter(f => f.status !== "success")
}

// ==================== 新建文件夹 ====================

function handleNewFolder() {
  if (isCreatingFolder.value) return
  isCreatingFolder.value = true
  newFolderName.value = ""
  nextTick(() => {
    newFolderInputRef.value?.focus()
  })
}

function cancelNewFolder() {
  isCreatingFolder.value = false
  newFolderName.value = ""
}

async function confirmNewFolder() {
  // 防止重复提交
  if (isSubmittingFolder.value) return
  if (!newFolderName.value.trim()) {
    ElMessage.warning("请输入文件夹名称")
    return
  }

  isSubmittingFolder.value = true
  try {
    const res = await createFolder({
      name: newFolderName.value.trim(),
      parentId: currentParentId.value // 始终传递 parentId，根目录传 0
    })
    if (res.code === 0) {
      ElMessage.success("文件夹创建成功")
      isCreatingFolder.value = false
      newFolderName.value = ""
      await fetchDocuments()
    } else {
      ElMessage.error(res.msg || "创建失败")
    }
  } catch {
    ElMessage.error("创建文件夹失败")
  } finally {
    isSubmittingFolder.value = false
  }
}

// ==================== 重命名 ====================

function handleRename(row: DocumentResponse) {
  // 如果已经在重命名其他文件，先取消
  if (renamingDocId.value !== null) {
    cancelInlineRename()
  }
  renamingDocId.value = row.id

  // 分离文件名和扩展名
  const lastDotIndex = row.name.lastIndexOf(".")
  if (lastDotIndex > 0 && row.type !== 1) {
    // 文件：只显示文件名，保存扩展名
    renamingName.value = row.name.substring(0, lastDotIndex)
    renamingExt.value = row.name.substring(lastDotIndex) // 包含点号，如 ".pdf"
  } else {
    // 文件夹或无扩展名：显示完整名称
    renamingName.value = row.name
    renamingExt.value = ""
  }

  nextTick(() => {
    if (renameInputRef.value) {
      renameInputRef.value.focus()
      renameInputRef.value.select()
    }
  })
}

function cancelInlineRename() {
  renamingDocId.value = null
  renamingName.value = ""
  renamingExt.value = ""
}

async function confirmInlineRename() {
  if (renamingDocId.value === null) return

  // 防止重复提交
  if (isSubmittingRename.value) return

  if (!renamingName.value.trim()) {
    ElMessage.warning("请输入新名称")
    return
  }

  isSubmittingRename.value = true
  try {
    // 拼接文件名和扩展名
    const fullName = renamingName.value.trim() + renamingExt.value
    const res = await updateDocument(renamingDocId.value, {
      name: fullName
    })
    if (res.code === 0) {
      ElMessage.success("重命名成功")
      renamingDocId.value = null
      renamingName.value = ""
      renamingExt.value = ""
      await fetchDocuments()
    } else {
      ElMessage.error(res.msg || "重命名失败")
    }
  } catch {
    ElMessage.error("重命名失败")
  } finally {
    isSubmittingRename.value = false
  }
}

// ==================== 移动 ====================

function handleMove(row: DocumentResponse) {
  currentDocument.value = row
  selectedTargetFolderId.value = null
  moveDialogVisible.value = true
  fetchFolderTree()
}

function handleTreeNodeClick(data: DocumentTreeNode) {
  selectedTargetFolderId.value = data.id
}

async function confirmMove() {
  if (selectedTargetFolderId.value === null) {
    ElMessage.warning("请选择目标文件夹")
    return
  }

  if (!currentDocument.value) return

  if (selectedTargetFolderId.value === currentDocument.value.id) {
    ElMessage.warning("不能移动到自身")
    return
  }

  moveConfirmLoading.value = true
  try {
    const res = await updateDocument(currentDocument.value.id, {
      parentId: selectedTargetFolderId.value
    })
    if (res.code === 0) {
      ElMessage.success("移动成功")
      moveDialogVisible.value = false
      await fetchDocuments()
    } else {
      ElMessage.error(res.msg || "移动失败")
    }
  } catch {
    ElMessage.error("移动失败")
  } finally {
    moveConfirmLoading.value = false
  }
}

// ==================== 删除 ====================

async function handleDelete(row: DocumentResponse) {
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${row.name}" 吗？${row.type === 1 ? "删除文件夹将同时删除其中所有内容。" : ""}`,
      "删除确认",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )

    const res = await deleteDocument(row.id)
    if (res.code === 0) {
      ElMessage.success("删除成功")
      await fetchDocuments()
    } else {
      ElMessage.error(res.msg || "删除失败")
    }
  } catch {
    // 用户取消
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 个项目吗？`,
      "批量删除确认",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )

    const promises = selectedRows.value.map(row => deleteDocument(row.id))
    await Promise.all(promises)
    ElMessage.success("批量删除成功")
    selectedRows.value = []
    await fetchDocuments()
  } catch {
    // 用户取消或删除失败
  }
}

// ==================== 权限管理 ====================

// 授权标签配置：userType 对应后端的用户类型
const authTabConfig: Record<AuthTargetType, { label: string, userType: 1 | 2 | 4 | 8 | 16 | 32 | 0 }> = {
  seniorTeacher: { label: "长执", userType: 8 },
  teacher: { label: "教师", userType: 4 },
  student: { label: "会友", userType: 2 },
  newUser: { label: "新人", userType: 32 },
  orgStaff: { label: "事工同工", userType: 16 },
  orgLeader: { label: "组长", userType: 0 },
  internal: { label: "统筹同工", userType: 1 },
  class: { label: "班级", userType: 0 }, // 班级 tab 不使用 userType
  org: { label: "小组", userType: 0 } // 小组 tab 不使用 userType
}

// 获取人员授权列表
async function fetchUserAuthorizations() {
  if (!currentDocument.value) return
  // 班级/小组/组长 tab 使用不同的 API，暂不处理
  if (authActiveTab.value === "class" || authActiveTab.value === "org" || authActiveTab.value === "orgLeader") {
    authUserList.value = []
    authTotal.value = 0
    return
  }

  authLoading.value = true
  authSelectedRows.value = []
  try {
    const config = authTabConfig[authActiveTab.value]
    // 合并名称筛选和邮箱搜索的关键词
    const keyword = authNameFilter.value || authKeyword.value || undefined
    const res = await getUserAuthorizations(currentDocument.value.id, {
      page: authPage.value,
      pageSize: authPageSize.value,
      status: authStatusFilter.value || undefined,
      keyword,
      userType: config.userType || undefined
    })
    if (res.code === 0) {
      authUserList.value = res.data.list
      authTotal.value = res.data.total
    }
  } catch {
    ElMessage.error("获取授权列表失败")
  } finally {
    authLoading.value = false
  }
}

// 打开授权弹窗
function handlePermission(row: DocumentResponse) {
  currentDocument.value = row
  authActiveTab.value = "seniorTeacher" // 默认大使
  authKeyword.value = ""
  authStatusFilter.value = ""
  authNameFilter.value = ""
  authNameOptions.value = []
  authPage.value = 1
  authSelectedRows.value = []
  permissionDialogVisible.value = true
  fetchUserAuthorizations()
}

// 切换授权标签
function handleAuthTabChange(tab: AuthTargetType) {
  authActiveTab.value = tab
  // 重置人员授权筛选
  authKeyword.value = ""
  authStatusFilter.value = ""
  authNameFilter.value = ""
  authNameOptions.value = []
  authPage.value = 1
  authSelectedRows.value = []
  // 重置班级授权筛选
  classAuthStatusFilter.value = ""
  classAuthNameFilter.value = ""
  classAuthNameOptions.value = []
  classAuthPage.value = 1
  classAuthSelectedRows.value = []
  // 重置小组授权筛选
  orgAuthStatusFilter.value = ""
  orgAuthOrgId.value = undefined
  orgAuthPage.value = 1
  orgAuthSelectedRows.value = []
  // 重置组长授权筛选
  leaderAuthStatusFilter.value = ""
  leaderAuthKeyword.value = ""
  leaderAuthPage.value = 1
  leaderAuthSelectedRows.value = []

  if (tab === "class") {
    fetchClassAuthorizations()
  } else if (tab === "org") {
    fetchOrgAuthorizations()
    loadOrgOptions()
  } else if (tab === "orgLeader") {
    fetchLeaderAuthorizations()
  } else {
    fetchUserAuthorizations()
  }
}

// 授权搜索
function handleAuthSearch() {
  authPage.value = 1
  fetchUserAuthorizations()
}

// 授权重置
function handleAuthReset() {
  authKeyword.value = ""
  authStatusFilter.value = ""
  authNameFilter.value = ""
  authNameOptions.value = []
  authPage.value = 1
  fetchUserAuthorizations()
}

// 授权状态筛选变化
function handleAuthStatusChange() {
  authPage.value = 1
  fetchUserAuthorizations()
}

// 名称筛选远程搜索
async function handleAuthNameRemoteSearch(query: string) {
  if (!currentDocument.value || !query) {
    authNameOptions.value = []
    return
  }

  authNameFilterLoading.value = true
  try {
    const config = authTabConfig[authActiveTab.value]
    const res = await getUserAuthorizations(currentDocument.value.id, {
      page: 1,
      pageSize: 50,
      keyword: query,
      userType: config.userType || undefined
    })
    if (res.code === 0) {
      // 提取唯一的用户选项
      const uniqueUsers = new Map<number, { userId: number, nickname: string }>()
      res.data.list.forEach((item) => {
        if (!uniqueUsers.has(item.userId)) {
          uniqueUsers.set(item.userId, { userId: item.userId, nickname: item.nickname })
        }
      })
      authNameOptions.value = Array.from(uniqueUsers.values())
    }
  } finally {
    authNameFilterLoading.value = false
  }
}

// 名称筛选变化
function handleAuthNameFilterChange() {
  // 当选择名称筛选时，清空邮箱搜索
  if (authNameFilter.value) {
    authKeyword.value = ""
  }
  authPage.value = 1
  fetchUserAuthorizations()
}

// 授权分页变化
function handleAuthPageChange(page: number) {
  authPage.value = page
  fetchUserAuthorizations()
}

// 授权每页条数变化
function handleAuthPageSizeChange(size: number) {
  authPageSize.value = size
  authPage.value = 1
  fetchUserAuthorizations()
}

// 授权选择变化
function handleAuthSelectionChange(rows: UserAuthorizationItem[]) {
  authSelectedRows.value = rows
}

// 单个授权
async function handleSingleAuthorize(row: UserAuthorizationItem) {
  if (!currentDocument.value) return

  try {
    await addAuthorization(currentDocument.value.id, {
      authType: 1, // 用户类型
      targetIds: [row.userId]
    })
    ElMessage.success("授权成功")
    await fetchUserAuthorizations()
  } catch {
    ElMessage.error("授权失败")
  }
}

// 单个取消授权
async function handleSingleCancelAuth(row: UserAuthorizationItem) {
  if (!currentDocument.value) return

  try {
    await batchCancelAuthorization(currentDocument.value.id, {
      authType: 1,
      targetIds: [row.userId]
    })
    ElMessage.success("取消授权成功")
    await fetchUserAuthorizations()
  } catch {
    ElMessage.error("取消授权失败")
  }
}

// 批量授权
async function handleBatchAuthorize() {
  if (!currentDocument.value || authSelectedRows.value.length === 0) return
  // 只授权未授权的用户
  const unauthorizedUsers = authSelectedRows.value.filter(r => !r.authorized)
  if (unauthorizedUsers.length === 0) {
    ElMessage.warning("选中的用户都已授权")
    return
  }

  try {
    await addAuthorization(currentDocument.value.id, {
      authType: 1,
      targetIds: unauthorizedUsers.map(r => r.userId)
    })
    ElMessage.success(`成功授权 ${unauthorizedUsers.length} 个用户`)
    await fetchUserAuthorizations()
  } catch {
    ElMessage.error("批量授权失败")
  }
}

// 批量取消授权
async function handleBatchCancelAuth() {
  if (!currentDocument.value || authSelectedRows.value.length === 0) return
  // 只取消已授权的用户
  const authorizedUsers = authSelectedRows.value.filter(r => r.authorized)
  if (authorizedUsers.length === 0) {
    ElMessage.warning("选中的用户都未授权")
    return
  }

  try {
    await batchCancelAuthorization(currentDocument.value.id, {
      authType: 1,
      targetIds: authorizedUsers.map(r => r.userId)
    })
    ElMessage.success(`成功取消授权 ${authorizedUsers.length} 个用户`)
    await fetchUserAuthorizations()
  } catch {
    ElMessage.error("批量取消授权失败")
  }
}

// ==================== 班级授权 ====================

// 获取班级授权列表
async function fetchClassAuthorizations() {
  if (!currentDocument.value) return

  classAuthLoading.value = true
  classAuthSelectedRows.value = []
  try {
    // 合并名称筛选的关键词
    const keyword = classAuthNameFilter.value || undefined
    const res = await getClassAuthorizations(currentDocument.value.id, {
      page: classAuthPage.value,
      pageSize: classAuthPageSize.value,
      status: classAuthStatusFilter.value || undefined,
      keyword
    })
    if (res.code === 0) {
      classAuthList.value = res.data.list
      classAuthTotal.value = res.data.total
    }
  } catch {
    ElMessage.error("获取班级授权列表失败")
  } finally {
    classAuthLoading.value = false
  }
}

// 班级授权状态筛选变化
function handleClassAuthStatusChange() {
  classAuthPage.value = 1
  fetchClassAuthorizations()
}

// 班级名称筛选远程搜索
async function handleClassAuthNameRemoteSearch(query: string) {
  if (!currentDocument.value || !query) {
    classAuthNameOptions.value = []
    return
  }

  classAuthNameFilterLoading.value = true
  try {
    const res = await getClassAuthorizations(currentDocument.value.id, {
      page: 1,
      pageSize: 50,
      keyword: query
    })
    if (res.code === 0) {
      // 提取唯一的班级选项
      const uniqueClasses = new Map<number, { classId: number, className: string }>()
      res.data.list.forEach((item) => {
        if (!uniqueClasses.has(item.classId)) {
          uniqueClasses.set(item.classId, { classId: item.classId, className: item.className })
        }
      })
      classAuthNameOptions.value = Array.from(uniqueClasses.values())
    }
  } finally {
    classAuthNameFilterLoading.value = false
  }
}

// 班级名称筛选变化
function handleClassAuthNameFilterChange() {
  classAuthPage.value = 1
  fetchClassAuthorizations()
}

// 班级授权重置
function handleClassAuthReset() {
  classAuthStatusFilter.value = ""
  classAuthNameFilter.value = ""
  classAuthNameOptions.value = []
  classAuthPage.value = 1
  fetchClassAuthorizations()
}

// 班级授权分页变化
function handleClassAuthPageChange(page: number) {
  classAuthPage.value = page
  fetchClassAuthorizations()
}

// 班级授权每页条数变化
function handleClassAuthPageSizeChange(size: number) {
  classAuthPageSize.value = size
  classAuthPage.value = 1
  fetchClassAuthorizations()
}

// 班级授权选择变化
function handleClassAuthSelectionChange(rows: ClassAuthorizationItem[]) {
  classAuthSelectedRows.value = rows
}

// 单个班级授权
async function handleSingleClassAuthorize(row: ClassAuthorizationItem) {
  if (!currentDocument.value) return

  try {
    await addAuthorization(currentDocument.value.id, {
      authType: 2, // 班级类型
      targetIds: [row.classId]
    })
    ElMessage.success("授权成功")
    await fetchClassAuthorizations()
  } catch {
    ElMessage.error("授权失败")
  }
}

// 单个班级取消授权
async function handleSingleClassCancelAuth(row: ClassAuthorizationItem) {
  if (!currentDocument.value) return

  try {
    await batchCancelAuthorization(currentDocument.value.id, {
      authType: 2,
      targetIds: [row.classId]
    })
    ElMessage.success("取消授权成功")
    await fetchClassAuthorizations()
  } catch {
    ElMessage.error("取消授权失败")
  }
}

// 批量班级授权
async function handleBatchClassAuthorize() {
  if (!currentDocument.value || classAuthSelectedRows.value.length === 0) return
  // 只授权未授权的班级
  const unauthorizedClasses = classAuthSelectedRows.value.filter(r => !r.authorized)
  if (unauthorizedClasses.length === 0) {
    ElMessage.warning("选中的班级都已授权")
    return
  }

  try {
    await addAuthorization(currentDocument.value.id, {
      authType: 2, // 班级类型
      targetIds: unauthorizedClasses.map(r => r.classId)
    })
    ElMessage.success(`成功授权 ${unauthorizedClasses.length} 个班级`)
    await fetchClassAuthorizations()
  } catch {
    ElMessage.error("批量授权失败")
  }
}

// 批量班级取消授权
async function handleBatchClassCancelAuth() {
  if (!currentDocument.value || classAuthSelectedRows.value.length === 0) return
  // 只取消已授权的班级
  const authorizedClasses = classAuthSelectedRows.value.filter(r => r.authorized)
  if (authorizedClasses.length === 0) {
    ElMessage.warning("选中的班级都未授权")
    return
  }

  try {
    await batchCancelAuthorization(currentDocument.value.id, {
      authType: 2,
      targetIds: authorizedClasses.map(r => r.classId)
    })
    ElMessage.success(`成功取消授权 ${authorizedClasses.length} 个班级`)
    await fetchClassAuthorizations()
  } catch {
    ElMessage.error("批量取消授权失败")
  }
}

// ==================== 小组授权 ====================

// 加载小组下拉选项
async function loadOrgOptions() {
  if (orgAuthOrgOptions.value.length > 0) return
  orgAuthOrgLoading.value = true
  try {
    const res = await getOrganizationsApi({ page: 1, pageSize: 999 })
    if (res.code === 0) {
      orgAuthOrgOptions.value = res.data.list.map(item => ({ id: item.id, name: item.name }))
    }
  } finally {
    orgAuthOrgLoading.value = false
  }
}

// 获取小组授权列表
async function fetchOrgAuthorizations() {
  if (!currentDocument.value) return

  orgAuthLoading.value = true
  orgAuthSelectedRows.value = []
  try {
    const res = await getOrgAuthorizations(currentDocument.value.id, {
      page: orgAuthPage.value,
      pageSize: orgAuthPageSize.value,
      status: orgAuthStatusFilter.value || undefined,
      keyword: undefined
    })
    if (res.code === 0) {
      orgAuthList.value = res.data.list
      orgAuthTotal.value = res.data.total
    }
  } catch {
    ElMessage.error("获取小组授权列表失败")
  } finally {
    orgAuthLoading.value = false
  }
}

function handleOrgAuthStatusChange() {
  orgAuthPage.value = 1
  fetchOrgAuthorizations()
}

function handleOrgAuthOrgChange() {
  orgAuthPage.value = 1
  fetchOrgAuthorizations()
}

function handleOrgAuthReset() {
  orgAuthStatusFilter.value = ""
  orgAuthOrgId.value = undefined
  orgAuthPage.value = 1
  fetchOrgAuthorizations()
}

function handleOrgAuthPageChange(page: number) {
  orgAuthPage.value = page
  fetchOrgAuthorizations()
}

function handleOrgAuthPageSizeChange(size: number) {
  orgAuthPageSize.value = size
  orgAuthPage.value = 1
  fetchOrgAuthorizations()
}

function handleOrgAuthSelectionChange(rows: OrgAuthorizationItem[]) {
  orgAuthSelectedRows.value = rows
}

async function handleSingleOrgAuthorize(row: OrgAuthorizationItem) {
  if (!currentDocument.value) return
  try {
    await addAuthorization(currentDocument.value.id, {
      authType: 3,
      targetIds: [row.orgId]
    })
    ElMessage.success("授权成功")
    await fetchOrgAuthorizations()
  } catch {
    ElMessage.error("授权失败")
  }
}

async function handleSingleOrgCancelAuth(row: OrgAuthorizationItem) {
  if (!currentDocument.value) return
  try {
    await batchCancelAuthorization(currentDocument.value.id, {
      authType: 3,
      targetIds: [row.orgId]
    })
    ElMessage.success("取消授权成功")
    await fetchOrgAuthorizations()
  } catch {
    ElMessage.error("取消授权失败")
  }
}

async function handleBatchOrgAuthorize() {
  if (!currentDocument.value || orgAuthSelectedRows.value.length === 0) return
  const targets = orgAuthSelectedRows.value.filter(r => !r.authorized)
  if (targets.length === 0) {
    ElMessage.warning("选中的小组都已授权")
    return
  }
  try {
    await addAuthorization(currentDocument.value.id, {
      authType: 3,
      targetIds: targets.map(r => r.orgId)
    })
    ElMessage.success(`成功授权 ${targets.length} 个小组`)
    await fetchOrgAuthorizations()
  } catch {
    ElMessage.error("批量授权失败")
  }
}

async function handleBatchOrgCancelAuth() {
  if (!currentDocument.value || orgAuthSelectedRows.value.length === 0) return
  const targets = orgAuthSelectedRows.value.filter(r => r.authorized)
  if (targets.length === 0) {
    ElMessage.warning("选中的小组都未授权")
    return
  }
  try {
    await batchCancelAuthorization(currentDocument.value.id, {
      authType: 3,
      targetIds: targets.map(r => r.orgId)
    })
    ElMessage.success(`成功取消授权 ${targets.length} 个小组`)
    await fetchOrgAuthorizations()
  } catch {
    ElMessage.error("批量取消授权失败")
  }
}

// ==================== 组长授权 ====================

async function fetchLeaderAuthorizations() {
  if (!currentDocument.value) return
  leaderAuthLoading.value = true
  leaderAuthSelectedRows.value = []
  try {
    const res = await getLeaderAuthorizations(currentDocument.value.id, {
      page: leaderAuthPage.value,
      pageSize: leaderAuthPageSize.value,
      status: leaderAuthStatusFilter.value || undefined,
      keyword: leaderAuthKeyword.value || undefined
    })
    if (res.code === 0) {
      leaderAuthList.value = res.data.list
      leaderAuthTotal.value = res.data.total
    }
  } catch {
    ElMessage.error("获取组长授权列表失败")
  } finally {
    leaderAuthLoading.value = false
  }
}

function handleLeaderAuthStatusChange() {
  leaderAuthPage.value = 1
  fetchLeaderAuthorizations()
}

function handleLeaderAuthSearch() {
  leaderAuthPage.value = 1
  fetchLeaderAuthorizations()
}

function handleLeaderAuthReset() {
  leaderAuthStatusFilter.value = ""
  leaderAuthKeyword.value = ""
  leaderAuthPage.value = 1
  fetchLeaderAuthorizations()
}

function handleLeaderAuthPageChange(page: number) {
  leaderAuthPage.value = page
  fetchLeaderAuthorizations()
}

function handleLeaderAuthPageSizeChange(size: number) {
  leaderAuthPageSize.value = size
  leaderAuthPage.value = 1
  fetchLeaderAuthorizations()
}

function handleLeaderAuthSelectionChange(rows: LeaderAuthorizationItem[]) {
  leaderAuthSelectedRows.value = rows
}

async function handleSingleLeaderAuthorize(row: LeaderAuthorizationItem) {
  if (!currentDocument.value) return
  try {
    await addAuthorization(currentDocument.value.id, { authType: 1, targetIds: [row.userId] })
    ElMessage.success("授权成功")
    await fetchLeaderAuthorizations()
  } catch {
    ElMessage.error("授权失败")
  }
}

async function handleSingleLeaderCancelAuth(row: LeaderAuthorizationItem) {
  if (!currentDocument.value) return
  try {
    await batchCancelAuthorization(currentDocument.value.id, { authType: 1, targetIds: [row.userId] })
    ElMessage.success("取消授权成功")
    await fetchLeaderAuthorizations()
  } catch {
    ElMessage.error("取消授权失败")
  }
}

async function handleBatchLeaderAuthorize() {
  if (!currentDocument.value || leaderAuthSelectedRows.value.length === 0) return
  const targets = leaderAuthSelectedRows.value.filter(r => !r.authorized)
  if (targets.length === 0) { ElMessage.warning("选中的组长都已授权"); return }
  try {
    await addAuthorization(currentDocument.value.id, { authType: 1, targetIds: targets.map(r => r.userId) })
    ElMessage.success(`成功授权 ${targets.length} 条记录`)
    await fetchLeaderAuthorizations()
  } catch {
    ElMessage.error("批量授权失败")
  }
}

async function handleBatchLeaderCancelAuth() {
  if (!currentDocument.value || leaderAuthSelectedRows.value.length === 0) return
  const targets = leaderAuthSelectedRows.value.filter(r => r.authorized)
  if (targets.length === 0) { ElMessage.warning("选中的组长都未授权"); return }
  try {
    await batchCancelAuthorization(currentDocument.value.id, { authType: 1, targetIds: targets.map(r => r.userId) })
    ElMessage.success(`成功取消授权 ${targets.length} 条记录`)
    await fetchLeaderAuthorizations()
  } catch {
    ElMessage.error("批量取消授权失败")
  }
}

// ==================== 格式化 ====================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))}${sizes[i]}`
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchDocuments()
})
</script>

<template>
  <div class="document-center">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <!-- 左侧：筛选标签 + 搜索 -->
      <div class="toolbar-left">
        <div class="filter-tabs">
          <div
            class="filter-tab"
            :class="{ active: activeTab === 'all' }"
            @click="handleTabChange('all')"
          >
            全部
          </div>
          <div
            class="filter-tab"
            :class="{ active: activeTab === 'media' }"
            @click="handleTabChange('media')"
          >
            音视频
          </div>
          <div
            class="filter-tab"
            :class="{ active: activeTab === 'document' }"
            @click="handleTabChange('document')"
          >
            文档
          </div>
          <div
            class="filter-tab"
            :class="{ active: activeTab === 'image' }"
            @click="handleTabChange('image')"
          >
            图片
          </div>
        </div>

        <div class="search-area">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入资料名称"
            class="search-input"
            @keyup.enter="handleSearch"
          >
            <template #suffix>
              <el-icon class="search-icon" @click="handleSearch">
                <Search />
              </el-icon>
            </template>
          </el-input>
          <el-button class="reset-btn" @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </div>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="toolbar-right">
        <el-button type="primary" @click="handleUpload">
          <el-icon><Plus /></el-icon>
          上传文件
        </el-button>

        <el-button class="outline-btn" @click="handleNewFolder">
          <el-icon><Plus /></el-icon>
          新建文件夹
        </el-button>

        <!-- <el-button class="outline-btn" :disabled="!selectedRows.length" @click="handleBatchPermission">
          <el-icon><Unlock /></el-icon>
          批量修改权限
          <el-icon class="help-icon">
            <QuestionFilled />
          </el-icon>
        </el-button> -->

        <el-button class="outline-btn danger" :disabled="!selectedRows.length" @click="handleBatchDelete">
          <el-icon><Delete /></el-icon>
          删除
        </el-button>
      </div>
    </div>

    <!-- 面包屑导航（仅在非根目录时显示） -->
    <div v-if="folderPath.length > 1" class="breadcrumb-nav">
      <template v-for="(item, index) in folderPath" :key="item.id">
        <span
          class="breadcrumb-item"
          :class="{ 'is-link': index < folderPath.length - 1 }"
          @click="index < folderPath.length - 1 && handleBreadcrumbClick(index)"
        >
          {{ item.name }}
        </span>
        <span v-if="index < folderPath.length - 1" class="breadcrumb-separator">/</span>
      </template>
    </div>

    <!-- 文件列表表格 -->
    <div class="file-table-wrapper">
      <!-- 空状态 -->
      <div v-if="!loading && tableData.length === 0" class="empty-state">
        <img src="@/common/assets/images/file-list-empty.png" alt="暂无内容" class="empty-icon">
        <p class="empty-text">
          暂无内容，点击<span class="upload-link" @click="handleUpload">上传文件</span>
        </p>
      </div>
      <!-- 表格 -->
      <el-table
        v-else
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        row-key="id"
        :row-class-name="({ row }) => row.isNewFolder ? 'new-folder-row' : ''"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" :selectable="(row) => !row.isNewFolder" />
        <el-table-column :label="tableColumnLabel" min-width="400">
          <template #default="{ row }">
            <!-- 新建文件夹行 -->
            <div v-if="row.isNewFolder" class="new-folder-cell">
              <div class="folder-icon-yellow">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#f4a623">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
              </div>
              <input
                ref="newFolderInputRef"
                v-model="newFolderName"
                type="text"
                class="folder-name-input"
                placeholder="请输入文件夹名称"
                @keyup.enter="confirmNewFolder"
                @keyup.escape="cancelNewFolder"
                @click.stop
              >
              <button class="folder-action-btn confirm" @click.stop="confirmNewFolder">
                <el-icon><Check /></el-icon>
              </button>
              <button class="folder-action-btn cancel" @click.stop="cancelNewFolder">
                <el-icon><Close /></el-icon>
              </button>
            </div>
            <!-- 普通文件行 -->
            <div v-else class="file-name-cell" @click="renamingDocId !== row.id && handleRowClick(row)">
              <div class="file-icon-wrapper">
                <img v-if="row.type === 1" :src="fileFolderIcon" class="file-png-icon">
                <img v-else-if="getFilePngIcon(row.name)" :src="getFilePngIcon(row.name)!" class="file-png-icon">
                <SvgIcon v-else :name="(getFileIconSvgName(row) as any)" class="file-svg-icon" />
              </div>
              <!-- 行内重命名输入框 -->
              <template v-if="renamingDocId === row.id">
                <input
                  ref="renameInputRef"
                  v-model="renamingName"
                  type="text"
                  class="rename-input"
                  @keyup.enter="confirmInlineRename"
                  @keyup.escape="cancelInlineRename"
                  @blur="confirmInlineRename"
                  @click.stop
                >
              </template>
              <span
                v-else
                class="file-name"
                :title="row.name"
              >{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="文件大小" width="120" sortable :sort-method="sortByFileSize">
          <template #default="{ row }">
            <span class="cell-text">{{ row.isNewFolder ? "-" : (row.type === 1 ? "-" : (row.file ? formatFileSize(row.file.size) : "-")) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <span class="cell-text">{{ row.isNewFolder ? "文件夹" : row.typeName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" width="180" sortable :sort-method="sortByCreatedAt">
          <template #default="{ row }">
            <span class="cell-text">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div v-if="!row.isNewFolder" class="action-cell">
              <el-button link type="primary" @click.stop="handlePermission(row)">
                权限管理
              </el-button>
              <el-button link type="primary" @click.stop="handleMove(row)">
                移动
              </el-button>
              <el-button link type="primary" @click.stop="handleRename(row)">
                重命名
              </el-button>
              <el-button link type="danger" @click.stop="handleDelete(row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-area">
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

    <!-- 上传文件对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传文件" width="600px" :close-on-click-modal="false">
      <!-- 拖拽上传区域 -->
      <el-upload
        drag
        multiple
        :auto-upload="false"
        :show-file-list="false"
        :accept="SUPPORTED_ACCEPT"
        :on-change="handleUploadChange"
        :disabled="isUploading"
      >
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持格式：xlsx、xls、csv、txt、mp3、docx、doc、mp4、mov、pdf、jpg、png、jpeg
          </div>
        </template>
      </el-upload>

      <!-- 文件列表 -->
      <div v-if="uploadFileList.length > 0" class="upload-file-list">
        <div class="upload-list-header">
          <span>待上传文件 ({{ uploadStats.success }}/{{ uploadStats.total }})</span>
          <el-button v-if="uploadStats.success > 0" link type="primary" size="small" @click="clearCompletedFiles">
            清除已完成
          </el-button>
        </div>
        <div class="upload-list-body">
          <div
            v-for="file in uploadFileList"
            :key="file.id"
            class="upload-file-item"
            :class="file.status"
          >
            <div class="file-info">
              <!-- 文件类型图标 -->
              <div class="upload-file-icon">
                <img v-if="getFilePngIcon(file.name)" :src="getFilePngIcon(file.name)!" class="upload-png-icon">
                <SvgIcon v-else :name="(getUploadFileIconSvgName(file.name) as any)" class="upload-svg-icon" />
              </div>
              <span class="file-name" :title="file.name">{{ file.name }}</span>
              <span class="file-size">{{ formatUploadFileSize(file.size) }}</span>
            </div>
            <div class="file-actions">
              <template v-if="file.status === 'uploading'">
                <el-progress
                  :percentage="file.progress"
                  :show-text="false"
                  :stroke-width="4"
                  class="file-progress"
                />
                <span class="progress-text">{{ file.progress }}%</span>
              </template>
              <template v-else-if="file.status === 'error'">
                <span class="error-msg">{{ file.errorMsg }}</span>
                <el-button link type="primary" size="small" @click="retryUploadFile(file.id)">
                  重试
                </el-button>
              </template>
              <template v-else-if="file.status === 'pending'">
                <el-button link type="danger" size="small" :disabled="isUploading" @click="removeUploadFile(file.id)">
                  移除
                </el-button>
              </template>
            </div>
          </div>
        </div>

        <!-- 总进度 -->
        <div v-if="isUploading || uploadComplete" class="upload-total-progress">
          <span>总进度：{{ uploadStats.success }}/{{ uploadStats.total }} 完成</span>
          <el-progress
            :percentage="Math.round((uploadStats.success / uploadStats.total) * 100)"
            :stroke-width="6"
            :status="uploadComplete ? 'success' : undefined"
            class="total-progress-bar"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="handleCancelUpload">
          {{ isUploading ? "取消上传" : "关闭" }}
        </el-button>
        <el-button
          type="primary"
          :loading="isUploading"
          :disabled="uploadFileList.length === 0 || (uploadStats.pending === 0 && !isUploading)"
          @click="startUploadQueue"
        >
          {{ isUploading ? "上传中..." : "开始上传" }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 移动文件对话框 -->
    <el-dialog v-model="moveDialogVisible" title="移动到" width="500px">
      <el-tree
        v-loading="folderTreeLoading"
        :data="folderTree"
        :props="{ children: 'children', label: 'name' }"
        highlight-current
        default-expand-all
        @node-click="handleTreeNodeClick"
      />
      <template #footer>
        <el-button @click="moveDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="moveConfirmLoading" @click="confirmMove">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 资源授权对话框 -->
    <el-dialog v-model="permissionDialogVisible" title="资源授权" width="900px" class="auth-dialog">
      <!-- 标签页 -->
      <div class="auth-tabs">
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'seniorTeacher' }"
          @click="handleAuthTabChange('seniorTeacher')"
        >
          长执
        </div>
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'teacher' }"
          @click="handleAuthTabChange('teacher')"
        >
          教师
        </div>
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'student' }"
          @click="handleAuthTabChange('student')"
        >
          会友
        </div>
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'newUser' }"
          @click="handleAuthTabChange('newUser')"
        >
          新人
        </div>
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'orgStaff' }"
          @click="handleAuthTabChange('orgStaff')"
        >
          事工同工
        </div>
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'orgLeader' }"
          @click="handleAuthTabChange('orgLeader')"
        >
          组长
        </div>
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'internal' }"
          @click="handleAuthTabChange('internal')"
        >
          统筹同工
        </div>
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'class' }"
          @click="handleAuthTabChange('class')"
        >
          班级
        </div>
        <div
          class="auth-tab"
          :class="{ active: authActiveTab === 'org' }"
          @click="handleAuthTabChange('org')"
        >
          小组
        </div>
      </div>

      <!-- 筛选区域 -->
      <div v-if="authActiveTab !== 'class' && authActiveTab !== 'org' && authActiveTab !== 'orgLeader'" class="auth-filter">
        <el-select
          v-model="authStatusFilter"
          placeholder="授权状态"
          class="filter-select"
          clearable
          @change="handleAuthStatusChange"
        >
          <el-option label="全部" value="" />
          <el-option label="已授权" value="authorized" />
          <el-option label="未授权" value="unauthorized" />
        </el-select>
        <el-input
          v-model="authKeyword"
          placeholder="请输入账号"
          class="filter-input"
          clearable
          @keyup.enter="handleAuthSearch"
        >
          <template #suffix>
            <el-icon class="search-icon" @click="handleAuthSearch">
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-button class="reset-btn" @click="handleAuthReset">
          <el-icon><RefreshLeft /></el-icon>
          重置
        </el-button>
        <el-button type="primary" :disabled="authSelectedRows.length === 0" @click="handleBatchAuthorize">
          授权
        </el-button>
        <el-button class="outline-btn danger" :disabled="authSelectedRows.length === 0" @click="handleBatchCancelAuth">
          取消授权
        </el-button>
      </div>

      <!-- 授权表格 -->
      <el-table
        v-if="authActiveTab !== 'class' && authActiveTab !== 'org' && authActiveTab !== 'orgLeader'"
        ref="authTableRef"
        v-loading="authLoading"
        :data="authUserList"
        style="width: 100%"
        row-key="userId"
        @selection-change="handleAuthSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column :label="`${authTabConfig[authActiveTab].label}昵称`" min-width="180">
          <template #default="{ row }">
            {{ row.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="账号" min-width="220">
          <template #default="{ row }">
            {{ row.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="授权状态" width="100">
          <template #default="{ row }">
            <span :class="row.authorized ? 'status-authorized' : 'status-unauthorized'">
              {{ row.authorized ? '已授权' : '未授权' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.authorized"
              link
              type="danger"
              @click="handleSingleCancelAuth(row)"
            >
              取消授权
            </el-button>
            <el-button
              v-else
              link
              type="primary"
              @click="handleSingleAuthorize(row)"
            >
              授权
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 班级 tab 筛选区域 -->
      <div v-if="authActiveTab === 'class'" class="auth-filter">
        <el-select
          v-model="classAuthStatusFilter"
          placeholder="授权状态"
          class="filter-select"
          clearable
          @change="handleClassAuthStatusChange"
        >
          <el-option label="全部" value="" />
          <el-option label="已授权" value="authorized" />
          <el-option label="未授权" value="unauthorized" />
        </el-select>
        <el-select
          v-model="classAuthNameFilter"
          placeholder="选择班级"
          class="filter-select name-filter"
          filterable
          remote
          clearable
          :remote-method="handleClassAuthNameRemoteSearch"
          :loading="classAuthNameFilterLoading"
          @change="handleClassAuthNameFilterChange"
        >
          <el-option
            v-for="item in classAuthNameOptions"
            :key="item.classId"
            :label="item.className"
            :value="item.className"
          />
        </el-select>
        <el-button class="reset-btn" @click="handleClassAuthReset">
          <el-icon><RefreshLeft /></el-icon>
          重置
        </el-button>
        <el-button type="primary" :disabled="classAuthSelectedRows.length === 0" @click="handleBatchClassAuthorize">
          授权
        </el-button>
        <el-button class="outline-btn danger" :disabled="classAuthSelectedRows.length === 0" @click="handleBatchClassCancelAuth">
          取消授权
        </el-button>
      </div>

      <!-- 班级授权表格 -->
      <el-table
        v-if="authActiveTab === 'class'"
        ref="classAuthTableRef"
        v-loading="classAuthLoading"
        :data="classAuthList"
        style="width: 100%"
        row-key="classId"
        @selection-change="handleClassAuthSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="小班名称" min-width="200">
          <template #default="{ row }">
            {{ row.className || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="授权状态" width="100">
          <template #default="{ row }">
            <span :class="row.authorized ? 'status-authorized' : 'status-unauthorized'">
              {{ row.authorized ? '已授权' : '未授权' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.authorized"
              link
              type="danger"
              @click="handleSingleClassCancelAuth(row)"
            >
              取消授权
            </el-button>
            <el-button
              v-else
              link
              type="primary"
              @click="handleSingleClassAuthorize(row)"
            >
              授权
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 - 人员授权 -->
      <div v-if="authActiveTab !== 'class' && authActiveTab !== 'org' && authActiveTab !== 'orgLeader'" class="auth-pagination">
        <span class="auth-total">共 {{ authTotal }} 条</span>
        <el-pagination
          v-model:current-page="authPage"
          v-model:page-size="authPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="authTotal"
          background
          layout="sizes, prev, pager, next"
          @size-change="handleAuthPageSizeChange"
          @current-change="handleAuthPageChange"
        />
      </div>

      <!-- 分页 - 班级授权 -->
      <div v-if="authActiveTab === 'class'" class="auth-pagination">
        <span class="auth-total">共 {{ classAuthTotal }} 条</span>
        <el-pagination
          v-model:current-page="classAuthPage"
          v-model:page-size="classAuthPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="classAuthTotal"
          background
          layout="sizes, prev, pager, next"
          @size-change="handleClassAuthPageSizeChange"
          @current-change="handleClassAuthPageChange"
        />
      </div>

      <!-- 小组 tab 筛选区域 -->
      <div v-if="authActiveTab === 'org'" class="auth-filter">
        <el-select
          v-model="orgAuthStatusFilter"
          placeholder="授权状态"
          class="filter-select"
          clearable
          @change="handleOrgAuthStatusChange"
        >
          <el-option label="全部" value="" />
          <el-option label="已授权" value="authorized" />
          <el-option label="未授权" value="unauthorized" />
        </el-select>
        <el-select
          v-model="orgAuthOrgId"
          placeholder="选择小组"
          class="filter-select name-filter"
          clearable
          :loading="orgAuthOrgLoading"
          @change="handleOrgAuthOrgChange"
        >
          <el-option
            v-for="item in orgAuthOrgOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
        <el-button class="reset-btn" @click="handleOrgAuthReset">
          <el-icon><RefreshLeft /></el-icon>
          重置
        </el-button>
        <el-button type="primary" :disabled="orgAuthSelectedRows.length === 0" @click="handleBatchOrgAuthorize">
          授权
        </el-button>
        <el-button class="outline-btn danger" :disabled="orgAuthSelectedRows.length === 0" @click="handleBatchOrgCancelAuth">
          取消授权
        </el-button>
      </div>

      <!-- 小组授权表格 -->
      <el-table
        v-if="authActiveTab === 'org'"
        ref="orgAuthTableRef"
        v-loading="orgAuthLoading"
        :data="orgAuthList"
        style="width: 100%"
        row-key="orgId"
        @selection-change="handleOrgAuthSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="小组名称" min-width="200">
          <template #default="{ row }">
            {{ row.orgName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="授权状态" width="100">
          <template #default="{ row }">
            <span :class="row.authorized ? 'status-authorized' : 'status-unauthorized'">
              {{ row.authorized ? '已授权' : '未授权' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.authorized"
              link
              type="danger"
              @click="handleSingleOrgCancelAuth(row)"
            >
              取消授权
            </el-button>
            <el-button
              v-else
              link
              type="primary"
              @click="handleSingleOrgAuthorize(row)"
            >
              授权
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 - 小组授权 -->
      <div v-if="authActiveTab === 'org'" class="auth-pagination">
        <span class="auth-total">共 {{ orgAuthTotal }} 条</span>
        <el-pagination
          v-model:current-page="orgAuthPage"
          v-model:page-size="orgAuthPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="orgAuthTotal"
          background
          layout="sizes, prev, pager, next"
          @size-change="handleOrgAuthPageSizeChange"
          @current-change="handleOrgAuthPageChange"
        />
      </div>

      <!-- 组长 tab 筛选区域 -->
      <div v-if="authActiveTab === 'orgLeader'" class="auth-filter">
        <el-select
          v-model="leaderAuthStatusFilter"
          placeholder="授权状态"
          class="filter-select"
          clearable
          @change="handleLeaderAuthStatusChange"
        >
          <el-option label="全部" value="" />
          <el-option label="已授权" value="authorized" />
          <el-option label="未授权" value="unauthorized" />
        </el-select>
        <el-input
          v-model="leaderAuthKeyword"
          placeholder="请输入账号"
          class="filter-input"
          clearable
          @keyup.enter="handleLeaderAuthSearch"
        >
          <template #suffix>
            <el-icon class="search-icon" @click="handleLeaderAuthSearch">
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-button class="reset-btn" @click="handleLeaderAuthReset">
          <el-icon><RefreshLeft /></el-icon>
          重置
        </el-button>
        <el-button type="primary" :disabled="leaderAuthSelectedRows.length === 0" @click="handleBatchLeaderAuthorize">
          授权
        </el-button>
        <el-button class="outline-btn danger" :disabled="leaderAuthSelectedRows.length === 0" @click="handleBatchLeaderCancelAuth">
          取消授权
        </el-button>
      </div>

      <!-- 组长授权表格 -->
      <el-table
        v-if="authActiveTab === 'orgLeader'"
        v-loading="leaderAuthLoading"
        :data="leaderAuthList"
        style="width: 100%"
        row-key="userId"
        @selection-change="handleLeaderAuthSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="组长昵称" min-width="160">
          <template #default="{ row }">
            {{ row.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="账号" min-width="180">
          <template #default="{ row }">
            {{ row.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="所在小组" min-width="180">
          <template #default="{ row }">
            {{ row.orgName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="授权状态" width="100">
          <template #default="{ row }">
            <span :class="row.authorized ? 'status-authorized' : 'status-unauthorized'">
              {{ row.authorized ? '已授权' : '未授权' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.authorized"
              link
              type="danger"
              @click="handleSingleLeaderCancelAuth(row)"
            >
              取消授权
            </el-button>
            <el-button
              v-else
              link
              type="primary"
              @click="handleSingleLeaderAuthorize(row)"
            >
              授权
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 - 组长授权 -->
      <div v-if="authActiveTab === 'orgLeader'" class="auth-pagination">
        <span class="auth-total">共 {{ leaderAuthTotal }} 条</span>
        <el-pagination
          v-model:current-page="leaderAuthPage"
          v-model:page-size="leaderAuthPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="leaderAuthTotal"
          background
          layout="sizes, prev, pager, next"
          @size-change="handleLeaderAuthPageSizeChange"
          @current-change="handleLeaderAuthPageChange"
        />
      </div>

      <template #footer>
        <el-button @click="permissionDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" @click="permissionDialogVisible = false">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 重名文件处理对话框 -->
    <el-dialog
      v-model="duplicateDialogVisible"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      width="480px"
      class="duplicate-dialog"
    >
      <template #header>
        <span />
      </template>
      <div class="duplicate-content">
        <div class="duplicate-icon-wrapper">
          <div class="file-icon-with-warning">
            <svg viewBox="0 0 48 48" width="48" height="48" class="file-svg">
              <path d="M8 4h20l12 12v28a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#e8eaed" stroke="#bdc1c6" stroke-width="1" />
              <path d="M28 4v10a2 2 0 002 2h10" fill="#fff" stroke="#bdc1c6" stroke-width="1" />
            </svg>
            <div class="warning-badge">
              <el-icon color="#e6a23c" size="20">
                <Warning />
              </el-icon>
            </div>
          </div>
        </div>
        <div class="duplicate-message">
          <template v-if="duplicateFiles.length === 1">
            <span>此位置已经存在名称为 "</span>
            <span class="filename">{{ duplicateFiles[0]?.name }}</span>
            <span>" 的文件，你要使用正在上传的文件进行替换吗?</span>
          </template>
          <template v-else>
            <span>本次上传的 {{ duplicateFiles.length }} 个文件与目标文件夹中的文件名称相同，你要使用正在上传的文件进行替换吗？</span>
          </template>
        </div>
      </div>
      <template #footer>
        <div class="duplicate-footer">
          <el-button @click="handleDuplicateKeep">
            保留两者
          </el-button>
          <el-button @click="handleDuplicateSkip">
            停止
          </el-button>
          <el-button type="primary" @click="handleDuplicateReplace">
            替换
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.document-center {
  padding: 20px 24px;
  background-color: #fff;
  min-height: 100%;

  .page-title {
    font-size: 18px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 20px;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .filter-tabs {
    display: flex;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;

    .filter-tab {
      padding: 8px 20px;
      font-size: 14px;
      color: #606266;
      cursor: pointer;
      border-right: 1px solid #dcdfe6;
      transition: all 0.2s;

      &:last-child {
        border-right: none;
      }

      &:hover {
        color: #409eff;
      }

      &.active {
        color: #409eff;
        background-color: #ecf5ff;
      }
    }
  }

  .search-area {
    display: flex;
    align-items: center;
    gap: 12px;

    .search-input {
      width: 220px;

      .search-icon {
        cursor: pointer;
        color: #909399;

        &:hover {
          color: #409eff;
        }
      }
    }

    .reset-btn {
      color: #606266;
      border-color: #dcdfe6;

      &:hover {
        color: #409eff;
        border-color: #c6e2ff;
        background-color: #ecf5ff;
      }
    }
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .outline-btn {
      color: #409eff;
      border-color: #409eff;
      background-color: #fff;

      &:hover {
        background-color: #ecf5ff;
      }

      &.danger {
        color: #f56c6c;
        border-color: #f56c6c;

        &:hover {
          background-color: #fef0f0;
        }
      }

      &:disabled {
        color: #c0c4cc;
        border-color: #e4e7ed;

        &:hover {
          background-color: #fff;
        }
      }

      .help-icon {
        margin-left: 4px;
        font-size: 14px;
      }
    }
  }

  .breadcrumb-nav {
    margin-bottom: 16px;
    padding: 12px 0;
    font-size: 14px;
    color: #606266;

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
  }

  .file-table-wrapper {
    border: 1px solid #ebeef5;
    border-radius: 4px;

    // 空状态样式
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      min-height: 400px;

      .empty-icon {
        width: 120px;
        height: auto;
        margin-bottom: 16px;
      }

      .empty-text {
        font-size: 14px;
        color: #909399;
        margin: 0;

        .upload-link {
          color: #409eff;
          cursor: pointer;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    :deep(.el-table) {
      --el-table-border-color: #ebeef5;

      th.el-table__cell {
        background-color: #fafafa;
        color: #606266;
        font-weight: 500;
      }

      .el-table__row:hover > td {
        background-color: #f5f7fa;
      }

      // 新建文件夹行样式
      .el-table__row.new-folder-row > td {
        background-color: #ecf5ff !important;
      }
    }
  }

  // 新建文件夹单元格样式
  .new-folder-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .folder-icon-yellow {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .folder-name-input {
      flex: 1;
      max-width: 200px;
      height: 28px;
      padding: 0 8px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      color: #303133;
      background-color: #fff;
      outline: none;
      transition: border-color 0.2s;

      &:focus {
        border-color: #409eff;
      }

      &::placeholder {
        color: #c0c4cc;
      }
    }

    .folder-action-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.8;
      }

      &.confirm {
        background-color: #409eff;
        color: #fff;
      }

      &.cancel {
        background-color: #409eff;
        color: #fff;
      }
    }
  }

  .file-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;

    &:hover .file-name {
      color: #409eff;
    }

    .file-icon-wrapper {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .folder-icon {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .file-svg-icon {
        width: 40px;
        height: 40px;
      }

      .file-png-icon {
        width: 24px;
        height: 24px;
        object-fit: contain;
      }
    }

    .file-name {
      flex: 1;
      min-width: 0;
      color: #303133;
      transition: color 0.2s;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    // 行内重命名输入框
    .rename-input {
      flex: 1;
      max-width: 200px;
      height: 28px;
      padding: 0 8px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      color: #303133;
      background-color: #fff;
      outline: none;
      transition: border-color 0.2s;

      &:focus {
        border-color: #409eff;
      }
    }

    .rename-action-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.2s;
      margin-left: 4px;

      &:hover {
        opacity: 0.8;
      }

      &.confirm {
        background-color: #409eff;
        color: #fff;
      }

      &.cancel {
        background-color: #409eff;
        color: #fff;
      }
    }
  }

  .cell-text {
    color: #606266;
  }

  .action-cell {
    display: flex;
    gap: 8px;
  }

  .pagination-area {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    padding: 12px 0;
  }

  // 多文件上传列表样式
  .upload-file-list {
    margin-top: 16px;
    border: 1px solid #ebeef5;
    border-radius: 4px;

    .upload-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: #fafafa;
      border-bottom: 1px solid #ebeef5;
      font-size: 14px;
      color: #606266;
    }

    .upload-list-body {
      max-height: 240px;
      overflow-y: auto;
    }

    .upload-file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid #ebeef5;
      transition: background-color 0.2s;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: #f5f7fa;
      }

      &.uploading {
        background-color: #ecf5ff;
      }

      &.success {
        background-color: #f0f9eb;
      }

      &.error {
        background-color: #fef0f0;
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;

        // 上传文件类型图标
        .upload-file-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .upload-svg-icon {
            width: 28px;
            height: 28px;
          }

          .upload-png-icon {
            width: 24px;
            height: 24px;
            object-fit: contain;
          }
        }

        .file-name {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          color: #303133;
        }

        .file-size {
          flex-shrink: 0;
          font-size: 12px;
          color: #909399;
          margin-left: 8px;
        }
      }

      .file-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: 16px;

        .file-progress {
          width: 80px;
        }

        .progress-text {
          font-size: 12px;
          color: #409eff;
          min-width: 36px;
          text-align: right;
        }

        .error-msg {
          font-size: 12px;
          color: #f56c6c;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .upload-total-progress {
      padding: 12px 16px;
      background-color: #fafafa;
      border-top: 1px solid #ebeef5;

      span {
        display: block;
        font-size: 12px;
        color: #606266;
        margin-bottom: 8px;
      }

      .total-progress-bar {
        width: 100%;
      }
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  // 授权弹窗样式
  .auth-tabs {
    display: flex;
    border-bottom: 1px solid #e4e7ed;
    margin-bottom: 16px;

    .auth-tab {
      padding: 12px 24px;
      font-size: 14px;
      color: #606266;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      margin-bottom: -1px;

      &:hover {
        color: #409eff;
      }

      &.active {
        color: #409eff;
        border-bottom-color: #409eff;
        font-weight: 500;
      }
    }
  }

  .auth-filter {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    .filter-select {
      width: 140px;

      &.teacher-filter {
        width: 160px;
      }

      &.name-filter {
        width: 180px;
      }
    }

    .filter-input {
      width: 200px;

      .search-icon {
        cursor: pointer;
        color: #909399;

        &:hover {
          color: #409eff;
        }
      }
    }

    .reset-btn {
      color: #606266;
      border-color: #dcdfe6;

      &:hover {
        color: #409eff;
        border-color: #c6e2ff;
        background-color: #ecf5ff;
      }
    }

    .outline-btn {
      color: #409eff;
      border-color: #409eff;
      background-color: #fff;

      &:hover {
        background-color: #ecf5ff;
      }

      &:disabled {
        color: #c0c4cc;
        border-color: #e4e7ed;

        &:hover {
          background-color: #fff;
        }
      }
    }
  }

  .auth-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;

    .auth-total {
      font-size: 14px;
      color: #606266;
    }
  }

  .auth-empty {
    padding: 60px 20px;
    text-align: center;
    color: #909399;
    font-size: 14px;
  }

  .status-authorized {
    color: #67c23a;
  }

  .status-unauthorized {
    color: #e6a23c;
  }

  // 重名弹窗样式
  .duplicate-content {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 8px 0;

    .duplicate-icon-wrapper {
      flex-shrink: 0;

      .file-icon-with-warning {
        position: relative;
        width: 48px;
        height: 48px;

        .file-svg {
          width: 48px;
          height: 48px;
        }

        .warning-badge {
          position: absolute;
          bottom: -4px;
          left: -4px;
        }
      }
    }

    .duplicate-message {
      flex: 1;
      font-size: 14px;
      color: #606266;
      line-height: 1.6;
      padding-top: 4px;

      .filename {
        color: #303133;
        font-weight: 500;
      }
    }
  }

  .duplicate-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>
