<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { SelectedItem } from "../components/SelectTargetModal.vue"
import dayjs from "dayjs"
import { ElMessage, ElMessageBox } from "element-plus"
import { computed, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import {
  categoryLabelMap,
  NoticeCategory,
  NoticeType,
  sendNoticeApi,
  TargetType
} from "@/api/notice/notice"
import SelectTargetModal from "../components/SelectTargetModal.vue"

defineOptions({
  name: "NoticeAdd"
})

const router = useRouter()

// ==================== 表单数据 ====================
const formRef = ref<FormInstance>()
const formData = reactive({
  title: "",
  category: "" as string,
  type: NoticeType.System as string, // 固定使用系统通知
  content: "",
  channels: [] as string[],
  targetType: "" as string,
  targetIds: [] as number[]
})

// 表单验证规则
// 检测是否包含表情符号
function hasEmoji(str: string): boolean {
  // 使用 Unicode 属性转义检测表情符号

  return /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(str)
}

const formRules: FormRules = {
  title: [
    { required: true, message: "请输入通知名称", trigger: "blur" },
    { max: 100, message: "通知名称不能超过100个字符", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (value && hasEmoji(value)) {
          callback(new Error("通知名称不支持表情符号"))
        } else {
          callback()
        }
      },
      trigger: "blur"
    }
  ],
  category: [
    { required: true, message: "请选择分类", trigger: "change" }
  ],
  content: [
    { required: true, message: "请输入通知内容", trigger: "blur" },
    { max: 1000, message: "通知内容不能超过1000个字符", trigger: "blur" }
  ],
  channels: [
    { required: true, message: "请选择推送渠道", trigger: "change" }
  ]
}

// ==================== 选项配置 ====================

// 分类选项（从 categoryLabelMap 生成）
const categoryOptions = computed(() => {
  // 只显示公告相关的分类
  const announcementCategories = [
    NoticeCategory.AnnouncementSystem,
    NoticeCategory.AnnouncementCommunity,
    NoticeCategory.AnnouncementClass
  ]
  return announcementCategories.map(key => ({
    label: categoryLabelMap[key],
    value: key
  }))
})

// 推送渠道选项
const channelOptions = [
  { label: "Push 推送", value: "push" },
  { label: "IM 消息", value: "im" }
]

// 通知内容最大长度（选择 push 渠道时为100，否则为1000）
const contentMaxLength = computed(() => {
  return formData.channels.includes("push") ? 100 : 1000
})

// 分类与发送范围的映射
const categoryToTargetType: Record<string, string> = {
  [NoticeCategory.AnnouncementSystem]: TargetType.User,
  [NoticeCategory.AnnouncementClass]: TargetType.Class,
  [NoticeCategory.AnnouncementCommunity]: TargetType.Community
}

// 分类变化时自动设置发送范围
function handleCategoryChange(category: string) {
  formData.targetType = categoryToTargetType[category] || ""
  // 切换分类时清空已选
  selectedItems.value = []
  formData.targetIds = []
}

// ==================== 选择目标弹窗 ====================
const selectModalVisible = ref(false)
const selectedItems = ref<SelectedItem[]>([])

// 打开选择弹窗
function handleOpenSelectModal() {
  if (!formData.category) {
    ElMessage.warning("请先选择分类")
    return
  }
  selectModalVisible.value = true
}

// 确认选择
function handleSelectConfirm(items: SelectedItem[]) {
  selectedItems.value = items
  formData.targetIds = items.map(item => item.id)
}

// 移除已选项
function handleRemoveSelected(item: SelectedItem) {
  selectedItems.value = selectedItems.value.filter(i => i.id !== item.id)
  formData.targetIds = selectedItems.value.map(i => i.id)
}

// ==================== 提交逻辑 ====================
const publishLoading = ref(false)
const scheduleLoading = ref(false)

// 校验 Push 推送时的内容字数限制
function validatePushContentLength(): boolean {
  if (formData.channels.includes("push") && formData.content.length > 100) {
    ElMessage.warning("push 内容最多100个字")
    return false
  }
  return true
}

// 发布通知
async function handlePublish() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (formData.targetIds.length === 0) {
    ElMessage.warning("请选择发送范围")
    return
  }

  if (!validatePushContentLength()) {
    return
  }

  try {
    await ElMessageBox.confirm(
      "确定要发布该通知吗？",
      "确认发布",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )

    await submitNotice("publish")
  } catch (error) {
    if (error !== "cancel") {
      console.error("发布失败", error)
    }
  }
}

// 定时发布
const scheduleDialogVisible = ref(false)
const scheduledTime = ref<Date>()
const scheduledTimeZone = ref("Asia/Shanghai")

// 时区选项
const timeZoneOptions = [
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
]

function handleSchedulePublish() {
  if (!formRef.value) return

  formRef.value.validate().then(() => {
    if (formData.targetIds.length === 0) {
      ElMessage.warning("请选择发送范围")
      return
    }
    if (!validatePushContentLength()) {
      return
    }
    scheduleDialogVisible.value = true
  }).catch(() => {
    // 验证失败
  })
}

async function handleConfirmSchedule() {
  if (!scheduledTime.value) {
    ElMessage.warning("请选择发布时间")
    return
  }

  const now = new Date()
  if (scheduledTime.value <= now) {
    ElMessage.warning("发布时间必须大于当前时间")
    return
  }

  scheduleDialogVisible.value = false
  // 格式化为字符串：2024-01-23 14:30:00
  const scheduledAtStr = dayjs(scheduledTime.value).format("YYYY-MM-DD HH:mm:ss")
  await submitNotice("schedule", scheduledAtStr)
}

// 提交通知
async function submitNotice(action: "publish" | "schedule", scheduledAt?: string) {
  const loading = action === "schedule" ? scheduleLoading : publishLoading
  loading.value = true

  try {
    const res = await sendNoticeApi({
      type: formData.type,
      category: formData.category,
      title: formData.title,
      content: formData.content,
      summary: formData.content.slice(0, 100),
      targetType: formData.targetType,
      targetIds: formData.targetIds,
      channels: formData.channels,
      scheduledAt: scheduledAt || undefined,
      timezone: scheduledAt ? scheduledTimeZone.value : undefined
    })

    if (res.code === 0) {
      ElMessage.success(action === "schedule" ? "定时发布成功" : "发布成功")
      // 发布成功进入已发布tab，定时发布成功进入待发布tab
      router.push(`/notice/list?tab=${action === "schedule" ? "pending" : "published"}`)
    } else {
      ElMessage.error(res.msg || "发布失败")
    }
  } catch (error) {
    console.error("提交失败", error)
    ElMessage.error("发布失败，请重试")
  } finally {
    loading.value = false
  }
}

// 取消
function handleCancel() {
  router.push("/notice/list")
}

// 禁用过去的日期
function disabledDate(time: Date) {
  return time.getTime() < Date.now() - 8.64e7 // 禁用今天之前的日期
}
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" class="notice-add-card">
      <!-- 表单 -->
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        class="notice-form"
      >
        <el-form-item label="通知名称" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入"
            maxlength="100"
            show-word-limit
            style="width: 400px"
          />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select
            v-model="formData.category"
            placeholder="请选择分类"
            style="width: 400px"
            @change="handleCategoryChange"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="推送渠道" prop="channels">
          <el-select
            v-model="formData.channels"
            multiple
            placeholder="请选择推送渠道"
            style="width: 400px"
          >
            <el-option
              v-for="item in channelOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="通知内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            placeholder="请输入通知内容"
            :rows="20"
            :maxlength="contentMaxLength"
            show-word-limit
            style="width: 600px"
          />
        </el-form-item>

        <el-form-item label="发送范围" required>
          <div class="target-select-wrapper">
            <div class="selected-tags">
              <el-tag
                v-for="item in selectedItems"
                :key="item.id"
                closable
                @close="handleRemoveSelected(item)"
              >
                {{ item.name }}
              </el-tag>
              <el-button
                type="primary"
                link
                @click="handleOpenSelectModal"
              >
                + 选择
              </el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item>
          <div class="form-actions">
            <el-button type="primary" :loading="publishLoading" @click="handlePublish">
              发布
            </el-button>
            <el-button :loading="scheduleLoading" @click="handleSchedulePublish">
              定时发布
            </el-button>
            <el-button @click="handleCancel">
              取消
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 选择目标弹窗 -->
    <SelectTargetModal
      v-model="selectModalVisible"
      :target-type="(formData.targetType as 'user' | 'class' | 'community' | 'organization')"
      :selected-items="selectedItems"
      custom-title="选择发送范围"
      @confirm="handleSelectConfirm"
    />

    <!-- 定时发布弹窗 -->
    <el-dialog
      v-model="scheduleDialogVisible"
      title="定时发布"
      width="500px"
    >
      <el-form label-width="80px">
        <el-form-item label="发布时间">
          <div class="schedule-time-wrapper">
            <el-select
              v-model="scheduledTimeZone"
              placeholder="请选择时区"
              class="schedule-timezone"
            >
              <el-option
                v-for="tz in timeZoneOptions"
                :key="tz.value"
                :label="tz.label"
                :value="tz.value"
              >
                <span style="float: left">{{ tz.label }}</span>
                <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px;">{{ tz.value }}</span>
              </el-option>
            </el-select>
            <el-date-picker
              v-model="scheduledTime"
              type="datetime"
              placeholder="选择发布时间"
              :disabled-date="disabledDate"
              class="schedule-datepicker"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="scheduleLoading" @click="handleConfirmSchedule">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.notice-add-card {
  .notice-form {
    padding: 0 20px;
  }

  .target-select-wrapper {
    .selected-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      min-height: 32px;
    }
  }

  .form-actions {
    display: flex;
    gap: 12px;
  }
}

.schedule-time-wrapper {
  display: flex;
  width: 100%;

  .schedule-timezone {
    width: 160px;
    flex-shrink: 0;
  }

  .schedule-datepicker {
    flex: 1;
    margin-left: -1px;
  }
}
</style>
