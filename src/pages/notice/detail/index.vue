<script lang="ts" setup>
import type { NoticeDetail } from "@/api/notice/notice"
import { formatDateTime } from "@@/utils/datetime"
import { ElMessage } from "element-plus"
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  categoryLabelMap,
  displayStatusLabelMap,
  displayStatusStyleMap,
  getDisplayStatus,
  getNoticeDetailApi,
  NoticeDisplayStatus
} from "@/api/notice/notice"

defineOptions({
  name: "NoticeDetail"
})

const router = useRouter()
const route = useRoute()

// 通知ID
const noticeId = computed(() => Number(route.params.id))

// 页面加载状态
const pageLoading = ref(false)

// 通知详情数据
const detail = ref<NoticeDetail | null>(null)

// 渠道名称映射
const channelNameMap: Record<string, string> = {
  inapp: "站内信",
  push: "Push 推送",
  email: "邮件",
  im: "IM 消息"
}

// ==================== 加载通知详情 ====================
async function loadNoticeDetail() {
  if (!noticeId.value) {
    ElMessage.error("通知ID不存在")
    router.push("/notice/list")
    return
  }

  pageLoading.value = true
  try {
    const res = await getNoticeDetailApi(noticeId.value)
    if (res.code === 0) {
      detail.value = res.data
    } else {
      ElMessage.error(res.msg || "获取通知详情失败")
      router.push("/notice/list")
    }
  } catch (error) {
    console.error("获取通知详情失败", error)
    ElMessage.error("获取通知详情失败")
    router.push("/notice/list")
  } finally {
    pageLoading.value = false
  }
}

// ==================== 格式化函数 ====================

// 获取分类名称
function getCategoryName(category: string): string {
  return categoryLabelMap[category] || category
}

// 获取状态标签
function getStatusLabel(): string {
  if (!detail.value) return ""
  const status = getDisplayStatus(detail.value)
  return displayStatusLabelMap[status] || status
}

// 获取状态样式
function getStatusType() {
  if (!detail.value) return "info" as const
  const status = getDisplayStatus(detail.value)
  return (displayStatusStyleMap[status]?.type || "info") as "primary" | "success" | "warning" | "info" | "danger"
}

// 获取渠道名称
function getChannelName(channel: string): string {
  return channelNameMap[channel] || channel
}

// 获取渠道列表文本
function getChannelsText(): string {
  if (!detail.value?.channels || detail.value.channels.length === 0) {
    return "-"
  }
  return detail.value.channels.map(ch => getChannelName(ch)).join("、")
}

// 获取发送范围文本
function getTargetText(): string {
  if (!detail.value?.targetDetails) return "-"

  const targets: string[] = []

  // 用户
  if (detail.value.targetDetails.users && detail.value.targetDetails.users.length > 0) {
    targets.push(...detail.value.targetDetails.users.map(u => u.nickname))
  }
  // 班级
  if (detail.value.targetDetails.classes && detail.value.targetDetails.classes.length > 0) {
    targets.push(...detail.value.targetDetails.classes.map(c => c.name))
  }
  // 社群
  if (detail.value.targetDetails.communities && detail.value.targetDetails.communities.length > 0) {
    targets.push(...detail.value.targetDetails.communities.map(c => c.name))
  }

  return targets.length > 0 ? targets.join("、") : "-"
}

// 是否是定时待发送状态
const isScheduled = computed(() => {
  if (!detail.value) return false
  return getDisplayStatus(detail.value) === NoticeDisplayStatus.Scheduled
})

// 格式化发送时间
function formatSendTime(): string {
  if (!detail.value) return "-"

  // 优先使用路由参数传入的定时发布时间（从列表页带入）
  const queryScheduledTimeStr = route.query.scheduledTimeStr as string
  const queryTimezone = route.query.timezone as string

  if (queryScheduledTimeStr) {
    if (queryTimezone) {
      return `${queryScheduledTimeStr} (${queryTimezone})`
    }
    return queryScheduledTimeStr
  }

  // 其次使用详情接口返回的 scheduledTimeStr
  if (detail.value.scheduledTimeStr) {
    if (detail.value.timezone) {
      return `${detail.value.scheduledTimeStr} (${detail.value.timezone})`
    }
    return detail.value.scheduledTimeStr
  }

  // 最后使用 sentAt
  if (detail.value.sentAt) {
    return formatDateTime(detail.value.sentAt * 1000)
  }

  return "-"
}

// 返回列表
function handleBack() {
  router.push("/notice/list")
}

// ==================== 初始化 ====================
onMounted(() => {
  loadNoticeDetail()
})
</script>

<template>
  <div class="app-container">
    <el-card v-loading="pageLoading" shadow="never" class="notice-detail-card">
      <template v-if="detail">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border label-width="120px" class="detail-section">
          <el-descriptions-item label="通知名称" :span="2">
            {{ detail.title }}
          </el-descriptions-item>
          <el-descriptions-item label="分类">
            {{ getCategoryName(detail.category) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType()" size="small">
              {{ getStatusLabel() }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="通知内容" :span="2">
            <div class="content-text">
              {{ detail.content }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="通知渠道" :span="2">
            {{ getChannelsText() }}
          </el-descriptions-item>
          <el-descriptions-item label="发送范围" :span="2">
            {{ getTargetText() }}
          </el-descriptions-item>
          <el-descriptions-item :label="isScheduled ? '定时发布时间' : '发送时间'" :span="2">
            {{ formatSendTime() }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button @click="handleBack">
            返回列表
          </el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.notice-detail-card {
  .detail-section {
    margin-bottom: 16px;
  }

  .content-text {
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
  }

  .form-actions {
    margin-top: 24px;
    display: flex;
    gap: 12px;
  }
}
</style>
