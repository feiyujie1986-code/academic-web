<script lang="ts" setup>
import type { UploadRequestOptions } from "element-plus"
import type { ClassUserModel } from "@/api/class/user"
import type { ChapterItem, fileMeta, LessonItem } from "@/api/course/lesson"
import fileCsvIcon from "@@/assets/images/file-csv-icon.png"
import fileExcelIcon from "@@/assets/images/file-excel-icon.png"
import fileFileIcon from "@@/assets/images/file-file-icon.png"
import fileGifIcon from "@@/assets/images/file-gif-icon.png"
import fileImgIcon from "@@/assets/images/file-img-icon.png"
import fileMp3Icon from "@@/assets/images/file-mp3-icon.png"
import fileMp4Icon from "@@/assets/images/file-mp4-icon.png"
import filePdfIcon from "@@/assets/images/file-pdf-icon.png"
import filePptIcon from "@@/assets/images/file-ppt-icon.png"
import fileSvgIcon from "@@/assets/images/file-svg-icon.png"
import fileTextIcon from "@@/assets/images/file-text-icon.png"
import fileWordIcon from "@@/assets/images/file-word-icon.png"
import fileZipIcon from "@@/assets/images/file-zip-icon.png"
import { QuillEditor } from "@vueup/vue-quill"
import dayjs from "dayjs"
import { ElMessage } from "element-plus"
import BlotFormatter from "quill-blot-formatter"
import { computed, reactive, ref } from "vue"
import { addLessonApi, editLessonApi } from "@/api/course/lesson"
import { uploadImage } from "@/api/fileM/file"
import { useChunkUpload } from "@/composables/useChunkUpload"
import ChunkVideoUpload from "./ChunkVideoUpload.vue"
import { formatDate, LessonType, LessonTypeIcons, LessonTypeLabels } from "./tools"
import "@vueup/vue-quill/dist/vue-quill.snow.css"

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: "saved", payload: { kind: "Add" | "Edit", data: LessonItem }): void
}>()

interface Props {
  courseId: number
  classId: number | null
  courseLessons: ChapterItem[]
  teachers: ClassUserModel[]
  seniorTeachers: ClassUserModel[]
}

const timeZones = ref([
  { value: "UTC", label: "UTC" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Seoul", label: "Seoul" },
  { value: "Asia/Kolkata", label: "Kolkata" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" }
])

const dialogState = ref({ visible: false, title: "新增小节", kind: "Add" as "Add" | "Edit" })
const submitting = ref(false)

// 工具栏配置
const toolbar = ref([
  // 标题-----[{ header: [1, 2, 3, 4, 5, 6, false] }]
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  // 字体颜色、字体背景颜色-----[{ color: [] }, { background: [] }]
  [{ color: [] }, { background: [] }],
  // 字体种类-----[{ font: [] }]
  //   [{ font: [] }],
  // 对齐方式-----[{ align: [] }]
  // 加粗 斜体 下划线 删除线 -----['bold', 'italic', 'underline', 'strike']
  ["bold", "italic", "underline", "strike"],
  // 1、2 级标题-----[{ header: 1 }, { header: 2 }]
  //   [{ header: 1 }, { header: 2 }],
  // 有序、无序列表-----[{ list: 'ordered' }, { list: 'bullet' }]
  [{ list: "ordered" }, { list: "bullet" }],
  ["image"],
  ["link"]
])

// Quill 模块配置
const quillModules = {
  name: "blotFormatter",
  module: BlotFormatter,
  options: {}
}

// Quill 编辑器实例引用
const quillEditorRef = ref<InstanceType<typeof QuillEditor> | null>(null)

// 验证图片URL安全性
function isValidImageUrl(url: string): boolean {
  // 检查是否为空
  if (!url || typeof url !== "string") {
    return false
  }

  // 检查危险协议（防止XSS）
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"]
  const lowerUrl = url.toLowerCase().trim()
  if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
    return false
  }

  // 必须是 http:// 或 https:// 开头
  if (!lowerUrl.startsWith("http://") && !lowerUrl.startsWith("https://")) {
    return false
  }

  // 尝试解析URL，验证格式合法性
  try {
    const parsed = new URL(url)
    // 确保协议是 http 或 https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false
    }
    return true
  } catch {
    return false
  }
}

// 预加载图片（确保图片在插入前已缓存）
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

// 自定义图片上传处理
function handleImageUpload() {
  const input = document.createElement("input")
  input.setAttribute("type", "file")
  input.setAttribute("accept", "image/jpeg,image/png,image/gif,image/webp")
  input.click()

  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    // 校验图片格式（排除浏览器不支持的 HEIC 等格式）
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i
    if (!allowedTypes.includes(file.type) && !allowedExtensions.test(file.name)) {
      ElMessage.error("请上传 JPG/PNG/GIF/WebP 格式的图片")
      return
    }

    // 校验图片大小（不超过50MB）
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      ElMessage.error("图片大小不能超过 50MB")
      return
    }

    const quill = quillEditorRef.value?.getQuill()
    if (!quill) return

    // 获取当前光标位置
    const range = quill.getSelection(true)
    const insertIndex = range.index

    // 在编辑器容器上创建覆盖层占位符（不通过 Quill 插入，直接操作 DOM）
    const editorContainer = quill.container as HTMLElement
    const placeholder = document.createElement("div")
    placeholder.className = "image-upload-overlay"
    placeholder.innerHTML = `
      <div class="placeholder-box">
        <span class="placeholder-icon">📷</span>
        <span class="placeholder-text">上传中......</span>
        <span class="placeholder-progress">
          <span class="placeholder-progress-bar" style="width: 0%"></span>
        </span>
      </div>
    `
    editorContainer.style.position = "relative"
    editorContainer.appendChild(placeholder)

    // 禁用编辑器，隐藏光标
    quill.disable()

    // 更新进度条
    const updateProgress = (percent: number) => {
      const barEl = placeholder.querySelector(".placeholder-progress-bar") as HTMLElement
      if (barEl) barEl.style.width = `${percent}%`
    }

    // 移除占位符
    const removePlaceholder = () => {
      if (placeholder.parentNode) {
        placeholder.remove()
      }
    }

    try {
      const res = await uploadImage(file, updateProgress)

      if (res.code === 0 && res.data?.fullpath) {
        const imageUrl = res.data.fullpath

        // 检查 fullpath 是否以 r2 开头（如 "r2://xxx"），如果是则提示插入失败
        // 完整的 https URL 不受影响
        if (imageUrl.startsWith("r2")) {
          removePlaceholder()
          quill.enable()
          ElMessage.error("图片插入失败")
          return
        }

        // 安全验证：检查URL协议和格式
        if (!isValidImageUrl(imageUrl)) {
          removePlaceholder()
          quill.enable()
          ElMessage.error("图片地址不合法")
          return
        }

        // 尝试预加载图片，失败时不阻止插入（某些格式如HEIC浏览器不支持预览）
        try {
          await preloadImage(imageUrl)
        } catch {
          console.warn("图片预加载失败，可能是浏览器不支持的格式")
        }
        removePlaceholder()
        // 重新启用编辑器
        quill.enable()
        quill.insertEmbed(insertIndex, "image", imageUrl)
        // 在图片后插入换行，光标定位到下一行
        quill.insertText(insertIndex + 1, "\n")
        quill.setSelection(insertIndex + 2, 0)
        ElMessage.success("图片上传成功")
      } else {
        removePlaceholder()
        // 重新启用编辑器
        quill.enable()
        ElMessage.error(res.msg || "图片上传失败")
      }
    } catch (err) {
      removePlaceholder()
      // 重新启用编辑器
      quill.enable()
      console.error("图片上传失败", err)
      ElMessage.error("图片上传失败")
    }
  }
}

// 编辑器准备完成后的回调
function onEditorReady(quill: any) {
  // 监听工具栏的图片按钮点击事件
  const toolbar = quill.getModule("toolbar")
  if (toolbar) {
    toolbar.addHandler("image", handleImageUpload)
  }

  // 监听编辑器内容区域滚动，调用blot-formatter hide方法
  const editorContainer = quill.root
  if (editorContainer) {
    editorContainer.addEventListener("scroll", () => {
      const blotFormatter = quill.getModule("blotFormatter")
      if (blotFormatter && typeof blotFormatter.hide === "function") {
        blotFormatter.hide()
      }
    })
  }
}

const formState = reactive({
  name: "",
  courseId: props.courseId,
  chapterId: undefined as number | undefined,
  lessonId: 0,
  classId: props.classId,
  lessonType: LessonType.Video,
  content: "",
  videoFile: { filename: "", size: 0, fullpath: "", md5: "" } as fileMeta,
  discussMode: 1,
  liveLink: "",
  liveProvider: "zoom",
  remark: "",
  attachments: [] as fileMeta[],
  teacherId: undefined as number | undefined,
  seniorTeacherId: undefined as number | undefined,
  startTime: "",
  endTime: "",
  dateRange: "" as string | [string, string], // startTime, endTime计算的
  duration: 0,
  timeZone: "Asia/Shanghai"
})

const quillEditorKey = ref(0)

function resetForm() {
  formState.name = ""
  formState.chapterId = undefined
  formState.lessonId = 0
  formState.lessonType = LessonType.Video
  formState.content = ""
  formState.videoFile = { filename: "", size: 0, fullpath: "", md5: "" }
  formState.discussMode = 1
  formState.liveLink = ""
  formState.liveProvider = "zoom"
  formState.remark = ""
  formState.attachments = []
  formState.teacherId = undefined
  formState.seniorTeacherId = undefined
  formState.startTime = ""
  formState.endTime = ""
  formState.dateRange = ""
  formState.duration = 0
  quillEditorKey.value += 1
  // 重置附件文件列表
  resetAttachmentFiles()
}

function openForAdd(defaultChapterId?: number, lessonType?: LessonType) {
  dialogState.value.visible = true
  dialogState.value.kind = "Add"
  dialogState.value.title = "新增小节"
  resetForm()
  formState.lessonType = lessonType || LessonType.Video
  if (defaultChapterId) formState.chapterId = defaultChapterId
}

function openForEdit(lesson: LessonItem) {
  // console.log(props.seniorTeachers, props.teachers, lesson.teacherId, lesson.seniorTeacherId, lesson)
  dialogState.value.visible = true
  dialogState.value.kind = "Edit"
  dialogState.value.title = "修改小节"
  formState.name = lesson.name
  formState.chapterId = lesson.chapterId
  formState.lessonId = lesson.lessonId
  formState.lessonType = lesson.lessonType
  formState.content = lesson.content
  formState.videoFile = lesson.videoFile || ({} as fileMeta)
  formState.discussMode = lesson.discussMode
  formState.liveLink = lesson.liveLink
  formState.liveProvider = lesson.liveProvider
  formState.remark = lesson.remark
  formState.attachments = lesson.attachments || []
  // 同步附件到文件列表
  syncAttachmentsToFiles()
  // 如果ID在教师列表中找不到，则显示为空（undefined）
  const teacherId = lesson.teacherId === 0 ? undefined : lesson.teacherId
  const seniorTeacherId = lesson.seniorTeacherId === 0 ? undefined : lesson.seniorTeacherId
  formState.teacherId = teacherId && props.teachers.some(t => t.userId === teacherId) ? teacherId : undefined
  formState.seniorTeacherId = seniorTeacherId && props.seniorTeachers.some(t => t.userId === seniorTeacherId) ? seniorTeacherId : undefined
  formState.startTime = lesson.startTime
  formState.endTime = lesson.endTime
  // 处理dateRange
  formState.dateRange = [formatDate(lesson.startTime) || "", formatDate(lesson.endTime) || ""]
  formState.timeZone = lesson.timeZone || formState.timeZone
  formState.duration = lesson.duration || 0
}

defineExpose({ openForAdd, openForEdit })

function handleCancel() {
  dialogState.value.visible = false
  resetForm()
}

// 附件上传 - 使用云存储直传（方案二：完全自定义文件列表）

// 附件文件状态接口
interface AttachmentFile {
  uid: string
  name: string
  size: number
  progress: number
  status: "uploading" | "success" | "error"
  fileMeta?: fileMeta
  cancelFn?: () => void // 取消上传函数
}

// 附件文件列表（包含上传中和已完成的）
const attachmentFiles = ref<AttachmentFile[]>([])

// 同步 formState.attachments 到 attachmentFiles（编辑模式加载已有附件）
function syncAttachmentsToFiles() {
  attachmentFiles.value = (formState.attachments || []).map((item, index) => ({
    uid: `existing-${index}-${Date.now()}`,
    name: item.filename,
    size: item.size,
    progress: 100,
    status: "success" as const,
    fileMeta: item
  }))
}

// 验证附件文件类型
function validateAttachmentFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    ElMessage.error(`不支持的文件格式: .${ext}`)
    return false
  }
  return true
}

// 附件上传前校验
function beforeAttachmentUpload(file: File): boolean {
  if (attachmentFiles.value.length >= 3) {
    ElMessage.warning("最多只能上传3个附件")
    return false
  }
  return validateAttachmentFile(file)
}

// 自定义上传
async function customUploadAttachment(options: UploadRequestOptions) {
  const file = options.file
  const uid = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`

  // 二次校验
  if (!validateAttachmentFile(file)) {
    return
  }

  const { start, reset, cancel } = useChunkUpload({
    onProgress: (progress) => {
      const item = attachmentFiles.value.find(f => f.uid === uid)
      if (item) {
        item.progress = progress
      }
    }
  })

  // 添加到文件列表
  const fileItem: AttachmentFile = {
    uid,
    name: file.name,
    size: file.size,
    progress: 0,
    status: "uploading",
    cancelFn: cancel
  }
  attachmentFiles.value.push(fileItem)

  try {
    const result = await start(file)
    if (result) {
      const meta: fileMeta = {
        filename: result.file.filename,
        size: result.file.size,
        fullpath: result.file.fullpath,
        md5: result.file.md5
      }
      // 更新状态
      const item = attachmentFiles.value.find(f => f.uid === uid)
      if (item) {
        item.status = "success"
        item.progress = 100
        item.fileMeta = meta
      }
      // 同步到 formState
      syncFilesToFormState()
      ElMessage.success("上传成功")
    } else {
      throw new Error("上传失败")
    }
  } catch (err: any) {
    // 检查文件是否已被移除（用户取消上传）
    const item = attachmentFiles.value.find(f => f.uid === uid)
    if (!item) {
      // 文件已被移除，说明是用户主动取消
      ElMessage.info("已取消上传")
      return
    }
    // 更新状态为错误，然后移除
    const index = attachmentFiles.value.findIndex(f => f.uid === uid)
    if (index > -1) {
      attachmentFiles.value.splice(index, 1)
    }
    // 判断是否是取消错误
    const isCancelled = err?.message?.includes("取消") || err?.message?.includes("cancel")
    if (isCancelled) {
      ElMessage.info("已取消上传")
    } else {
      ElMessage.error(err?.message || "上传失败")
    }
  } finally {
    reset()
  }
}

// 同步 attachmentFiles 到 formState.attachments
function syncFilesToFormState() {
  formState.attachments = attachmentFiles.value
    .filter(f => f.status === "success" && f.fileMeta)
    .map(f => f.fileMeta!)
}

// 移除附件
async function removeAttachmentFile(file: AttachmentFile) {
  // 如果文件正在上传，先取消上传
  if (file.status === "uploading" && file.cancelFn) {
    file.cancelFn()
  }

  const index = attachmentFiles.value.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    attachmentFiles.value.splice(index, 1)
    // 同步到 formState
    syncFilesToFormState()
  }
}

// 重置附件文件列表
function resetAttachmentFiles() {
  attachmentFiles.value = []
}

// 获取文件 PNG 图标
// 支持的附件文件扩展名
const ALLOWED_ATTACHMENT_EXTENSIONS = [
  // Excel
  "xls",
  "xlsx",
  // CSV
  "csv",
  // Word
  "doc",
  "docx",
  // PPT
  "ppt",
  "pptx",
  // PDF
  "pdf",
  // 文本
  "txt",
  "rtf",
  // 音频
  "mp3",
  "wav",
  "m4a",
  // 视频
  "mp4",
  "avi",
  "mov",
  "mkv",
  "flv",
  "wmv",
  "webm",
  "m4v",
  // 压缩文件
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  // 图片
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp"
]

function getFilePngIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  if (["xls", "xlsx"].includes(ext)) return fileExcelIcon
  if (ext === "csv") return fileCsvIcon
  if (["doc", "docx"].includes(ext)) return fileWordIcon
  if (["ppt", "pptx"].includes(ext)) return filePptIcon
  if (ext === "pdf") return filePdfIcon
  if (["txt", "rtf"].includes(ext)) return fileTextIcon
  if (["mp3", "wav", "m4a"].includes(ext)) return fileMp3Icon
  if (["mp4", "avi", "mov", "mkv", "flv", "wmv", "webm", "m4v"].includes(ext)) return fileMp4Icon
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return fileZipIcon
  if (ext === "gif") return fileGifIcon
  if (ext === "svg") return fileSvgIcon
  if (["jpg", "jpeg", "png", "webp", "bmp"].includes(ext)) return fileImgIcon
  return fileFileIcon
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function handleDurationBlur() {
  // placeholder for any duration logic
}

async function handleOk() {
  // 检查是否有正在上传的附件
  if (attachmentFiles.value.some(f => f.status === "uploading")) {
    ElMessage.warning("附件正在上传中，请等待上传完成后再提交")
    return
  }

  if (!formState.name) {
    ElMessage.error("请填写课节名称")
    return
  }

  switch (formState.lessonType) {
    case LessonType.Video:
      if (formState.videoFile.filename === "") {
        ElMessage.error("请上传视频文件")
        return
      }
      break
    case LessonType.Live:
      if (!formState.liveLink) {
        ElMessage.error("请输入直播链接")
        return
      }
      break
    case LessonType.Discuss:
      if (!formState.discussMode) {
        ElMessage.error("请选择讨论模式")
        return
      }
      if (formState.discussMode === 1 && !formState.liveLink) {
        ElMessage.error("请输入直播链接")
        return
      }
      break
    case LessonType.Work:
      if (!formState.content) {
        ElMessage.error("请填写作业要求")
        return
      }
      break
  }

  if (formState.content && formState.content.length > 20000) {
    ElMessage.error("内容长度不能超过20000个字符")
    return
  }

  const params = {
    name: formState.name,
    courseId: props.courseId,
    classId: props.classId,
    chapterId: formState.chapterId as number,
    lessonType: formState.lessonType,
    content: formState.content,
    videoFile: formState.videoFile,
    liveLink: formState.liveLink,
    remark: formState.remark,
    discussMode: formState.discussMode,
    liveProvider: "zoom",
    attachments: formState.attachments,
    teacherId: formState.teacherId,
    seniorTeacherId: formState.seniorTeacherId,
    startTime: formState.startTime, // dateRange处理后给startTime和endTime
    endTime: formState.endTime,
    timeZone: formState.timeZone,
    duration: formState.duration,
    id: formState.lessonId
  }

  if (props.classId !== null) { // 班级排课才有人员和时间安排
    if (formState.lessonType === LessonType.Live || formState.lessonType === LessonType.Discuss) {
    // 直播和讨论课使用startTime
      if (!formState.startTime) {
        ElMessage.error("请选择开始时间")
        return
      }
      if (!formState.duration || formState.duration <= 0) {
        ElMessage.error("请输入有效的课节时长")
        return
      }
      // 计算endTime
      const start = new Date(formState.startTime)
      const end = new Date(start.getTime() + formState.duration * 60000)
      params.endTime = dayjs(end).format("YYYY-MM-DD HH:mm:ss")
    } else {
      if (Array.isArray(formState.dateRange) && formState.dateRange.length === 2) {
        if (formState.dateRange[0] === "" || formState.dateRange[1] === "") {
          ElMessage.error("请选择课节日期")
          return
        }
        params.startTime = dayjs(formState.dateRange[0]).format("YYYY-MM-DD 00:00:00")
        params.endTime = dayjs(formState.dateRange[1]).format("YYYY-MM-DD 23:59:59")
      } else {
        ElMessage.error("请选择课节日期")
        return
      }
    }
  }

  submitting.value = true
  try {
    if (dialogState.value.kind === "Add") {
      const res = await addLessonApi(params)
      if (res.code === 0) {
        ElMessage({ type: "success", message: res.msg })
        emit("saved", { kind: "Add", data: res.data })
        dialogState.value.visible = false
        resetForm()
      } else {
        ElMessage.error(res.msg)
      }
    } else {
      const res = await editLessonApi(params)
      if (res.code === 0) {
        ElMessage({ type: "success", message: res.msg })
        emit("saved", { kind: "Edit", data: res.data })
        dialogState.value.visible = false
        resetForm()
      } else {
        ElMessage.error(res.msg)
      }
    }
  } catch (err) {
    console.error("保存失败", err)
    ElMessage.error("保存失败")
  } finally {
    submitting.value = false
  }
}

const isEditorFullscreen = ref(false)

function toggleEditorFullscreen() {
  isEditorFullscreen.value = !isEditorFullscreen.value

  // 切换全屏时调用blot-formatter hide方法
  const quill = quillEditorRef.value?.getQuill()
  if (quill) {
    const blotFormatter = quill.getModule("blotFormatter") as any
    if (blotFormatter && typeof blotFormatter.hide === "function") {
      blotFormatter.hide()
    }
  }
}

// 字段可见性计算属性
const fieldVisibility = computed(() => ({
  // 时间选择器类型 - 直播和讨论课用datetime，其他用daterange
  useDateTimePicker: formState.lessonType === LessonType.Live || formState.lessonType === LessonType.Discuss,
  // 时长字段 - 仅直播和讨论课显示
  duration: formState.lessonType === LessonType.Live || formState.lessonType === LessonType.Discuss,
  // 视频上传 - 仅录播视频显示
  video: formState.lessonType === LessonType.Video,
  // 直播链接 - 仅直播课显示
  liveLink: formState.lessonType === LessonType.Live,
  // 讨论方式 - 仅讨论课显示
  discussMode: formState.lessonType === LessonType.Discuss,
  // 教学备注 - 作业任务不显示
  remark: formState.lessonType !== LessonType.Work,
  // 内容字段是否必填 - 仅作业任务必填
  contentRequired: formState.lessonType === LessonType.Work
}))

// 切换讨论模式时清理直播链接
function handleDiscussModeChange() {
  formState.liveLink = ""
}

// 动态标签
const dynamicLabels = computed(() => ({
  timeField: fieldVisibility.value.useDateTimePicker ? "开始时间" : "课节日期",
  contentField: formState.lessonType === LessonType.Work ? "作业要求" : "内容",
  attachmentField: formState.lessonType === LessonType.Work ? "添加作业" : "添加附件",
  uploadButton: formState.lessonType === LessonType.Work ? "上传作业" : "上传附件"
}))
</script>

<template>
  <el-dialog
    v-model="dialogState.visible"
    width="800px"
    @close="handleCancel"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <template #header>
      <span class="title">{{ dialogState.title }}
        <span class="title-des">
          <img :src="LessonTypeIcons[formState.lessonType]" class="lesson-type-icon1" alt="">{{ LessonTypeLabels[formState.lessonType] }}
        </span>
      </span>
    </template>
    <el-form :model="formState" label-position="right" label-width="auto">
      <el-form-item label="课节类型" required hidden>
        <el-radio-group v-model="formState.lessonType">
          <el-radio :value="1" class="radio-item">
            录播视频
          </el-radio>
          <el-radio :value="2" class="radio-item">
            图文课
          </el-radio>
          <el-radio :value="3" class="radio-item">
            直播课
          </el-radio>
          <el-radio :value="4" class="radio-item">
            讨论课
          </el-radio>
          <el-radio :value="5" class="radio-item">
            作业任务
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="课节名称" required>
        <el-input v-model="formState.name" placeholder="请填写课节名称" maxlength="100" show-word-limit clearable />
      </el-form-item>

      <el-form-item v-if="classId !== null" label="教师">
        <el-select v-model="formState.teacherId" placeholder="请选择教师" filterable clearable class="personnel-select">
          <el-option v-for="teacher in props.teachers" :key="teacher.userId" :label="teacher.nickname" :value="teacher.userId">
            {{ teacher.nickname }}
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item v-if="classId !== null" :label="dynamicLabels.timeField" required>
        <div class="time-wrapper">
          <span class="time-item time-zone">
            <el-select v-model="formState.timeZone" placeholder="请选择时区">
              <el-option v-for="tz in timeZones" :key="tz.value" :label="tz.label" :value="tz.value">
                <span style="float: left">{{ tz.label }}</span>
                <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px;">{{ tz.value }}</span>
              </el-option>
            </el-select>
          </span>
          <span class="time-item time-datepicker">
            <el-date-picker v-if="fieldVisibility.useDateTimePicker" v-model="formState.startTime" type="datetime" placeholder="请选择开始时间" value-format="YYYY-MM-DD HH:mm:ss" />
            <el-date-picker
              v-else
              v-model="formState.dateRange"
              type="daterange"
              range-separator="-"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
            />
          </span>
        </div>
      </el-form-item>

      <el-form-item v-if="fieldVisibility.duration" label="时长" required>
        <el-input-number v-model="formState.duration" controls-position="right" placeholder="请输入时长，单位分钟" @change="handleDurationBlur" />
        <span style="margin-left: 10px;">min</span>
      </el-form-item>

      <el-form-item v-if="fieldVisibility.video" label="视频" required>
        <ChunkVideoUpload v-model="formState.videoFile" />
      </el-form-item>

      <el-form-item v-if="fieldVisibility.liveLink" label="链接地址" required>
        <el-input v-model="formState.liveLink" placeholder="请输入直播链接地址" maxlength="1024" show-word-limit clearable />
      </el-form-item>

      <el-form-item v-if="fieldVisibility.discussMode" label="讨论方式" required>
        <div class="discuss-mode-wrapper">
          <span class="discuss-mode-item">
            <el-select v-model="formState.discussMode" @change="handleDiscussModeChange">
              <el-option :value="1" label="Zoom讨论" style="margin-bottom: 8px;">
                Zoom讨论
              </el-option>
              <el-option :value="2" label="社群讨论" style="margin-bottom: 8px;">
                社群讨论
              </el-option>
            </el-select>
          </span>
          <span class="discuss-mode-item discuss-input">
            <el-input v-if="formState.discussMode === 1" v-model="formState.liveLink" placeholder="请输入直播链接地址" maxlength="1024" show-word-limit clearable />
          </span>
        </div>
      </el-form-item>

      <el-form-item :label="dynamicLabels.contentField" :required="fieldVisibility.contentRequired">
        <!-- <el-input v-model="formState.content" type="textarea" :rows="6" :placeholder="formState.lessonType === LessonType.Work ? '作业要求' : '内容'" :maxlength="500" show-word-limit /> -->
        <div class="editor-wrapper" :class="isEditorFullscreen ? 'editor-wrapper-fullscreen' : ''">
          <QuillEditor
            ref="quillEditorRef"
            :key="quillEditorKey"
            theme="snow"
            v-model:content="formState.content"
            content-type="html"
            :toolbar="toolbar"
            :modules="[quillModules]"
            @ready="onEditorReady"
          />
          <span class="zoom-action" @click="toggleEditorFullscreen">
            <el-icon>
              <zoom-out v-if="isEditorFullscreen" />
              <zoom-in v-else />
            </el-icon>
          </span>
        </div>
      </el-form-item>

      <el-form-item v-if="fieldVisibility.remark" label="教学备注">
        <el-input v-model="formState.remark" type="textarea" placeholder="请输入备注" maxlength="5000" show-word-limit clearable />
      </el-form-item>

      <el-form-item :label="dynamicLabels.attachmentField">
        <div class="attachment-upload-wrapper">
          <!-- el-upload 只负责触发上传，不显示文件列表 -->
          <el-upload
            :show-file-list="false"
            :http-request="customUploadAttachment"
            :before-upload="beforeAttachmentUpload"
            :disabled="attachmentFiles.length >= 3"
            multiple
          >
            <el-button :disabled="attachmentFiles.length >= 3">
              <el-icon><Upload /></el-icon>
              {{ dynamicLabels.uploadButton }}
            </el-button>
          </el-upload>
          <div class="attachment-tip">
            附件最多可上传3个
          </div>

          <!-- 自定义文件列表 -->
          <div v-if="attachmentFiles.length > 0" class="attachment-file-list">
            <div v-for="file in attachmentFiles" :key="file.uid" class="attachment-file-item" :class="{ 'is-uploading': file.status === 'uploading', 'is-success': file.status === 'success' }">
              <div class="attachment-file-info">
                <img :src="getFilePngIcon(file.name)" class="attachment-file-icon" alt="">
                <span class="attachment-file-name" :title="file.name">{{ file.name }}</span>
                <span class="attachment-file-size">{{ formatFileSize(file.size) }}</span>
                <el-icon class="attachment-file-remove" @click="removeAttachmentFile(file)">
                  <Close />
                </el-icon>
              </div>
              <!-- 上传中显示进度条 -->
              <el-progress
                v-if="file.status === 'uploading'"
                :percentage="file.progress"
                :stroke-width="4"
                class="attachment-file-progress"
              />
            </div>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleOk">确定</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
  .title {
  display: flex;
  align-items: center;
}
.title-des {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: 10px;
  display: flex;
  align-items: center;
  img {
    display: block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
    margin-right: 4px;
  }
}
.radio-item {
  display: inline-flex;
  align-items: center;
  margin-right: 20px;
}

:deep(.ql-toolbar) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  background-color: #fff;
  border-bottom: 1px solid #ccc;
}

:deep(.ql-container) {
  padding-top: 42px; /* toolbar的高度 */
}

:deep(.ql-editor) {
  height: 260px;
  width: 690px;
  border-radius: 4px;
}

.editor-wrapper {
  position: relative;
  overflow-y: hidden;
}

.zoom-action {
  position: absolute;
  bottom: 10px;
  right: 10px;
  cursor: pointer;
  font-size: 20px;
  color: var(--el-text-color-regular);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: var(--el-fill-color-light);
  transition: all 0.3s;
  z-index: 3;

  &:hover {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}

.editor-wrapper-fullscreen {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  margin-left: -400px;
  width: 800px;
  height: 100vh;
  padding-bottom: 60px;
  box-sizing: border-box;
  z-index: 1000;
  background-color: #fff;
}

.editor-wrapper-fullscreen :deep(.ql-editor) {
  height: 100%;
  width: 100%;
}

.time-wrapper,
.discuss-mode-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
}

.time-zone,
.discuss-mode-item,
.personnel-select {
  width: 200px;
}

.discuss-input {
  flex: 1;
}

.discuss-input,
.time-datepicker {
  margin-left: -2px;
}

/* 图片上传覆盖层样式 - 铺满整个编辑器阻挡交互 */
:deep(.image-upload-overlay) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 10;
  user-select: none;
}

:deep(.image-upload-overlay .placeholder-box) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 120px;
  background-color: rgba(245, 247, 250, 0.95);
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}

:deep(.image-upload-overlay .placeholder-icon) {
  font-size: 32px;
  margin-bottom: 8px;
}

:deep(.image-upload-overlay .placeholder-text) {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

:deep(.image-upload-overlay .placeholder-progress) {
  width: 80%;
  height: 6px;
  background-color: #e4e7ed;
  border-radius: 3px;
  overflow: hidden;
}

:deep(.image-upload-overlay .placeholder-progress-bar) {
  height: 100%;
  background-color: #409eff;
  border-radius: 3px;
  transition: width 0.2s ease;
}

// 附件上传容器样式
.attachment-upload-wrapper {
  width: 100%;
}

.attachment-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.attachment-file-list {
  margin-top: 12px;
}

.attachment-file-item {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-fill-color-blank);
  margin-bottom: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &:last-child {
    margin-bottom: 0;
  }

  // 上传中的文件背景色
  &.is-uploading {
    background-color: #f5f7fa;

    &:hover {
      background-color: #f0f2f5;
    }
  }

  // 已上传完成的文件背景色（浅绿色）
  &.is-success {
    background-color: #f0f9eb;

    &:hover {
      background-color: #e1f3d8;
    }
  }

  .attachment-file-info {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .attachment-file-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    margin-right: 8px;
  }

  .attachment-file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  .attachment-file-size {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-left: 12px;
    margin-right: 12px;
  }

  .attachment-file-remove {
    flex-shrink: 0;
    font-size: 16px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--el-color-danger);
    }
  }

  .attachment-file-progress {
    width: 100%;
    margin-top: 8px;
  }
}
</style>
