<script lang="ts" setup>
import type { FeedbackDataModel } from "@/api/feedback/feedback"
import { formatDateTime } from "@@/utils/datetime"
import { FeedbackType, getFeedbackDetailApi } from "@/api/feedback/feedback"
import { getFileAccessUrlApi } from "@/api/fileM/file"

defineOptions({ name: "FeedbackDetail" })

const route = useRoute()
const router = useRouter()

// 页面状态
const pageLoading = ref(false)
const feedbackInfo = ref<FeedbackDataModel | null>(null)

// 获取反馈详情
async function fetchDetail() {
  const id = Number(route.params.id)
  if (!id) {
    ElMessage.error("参数错误")
    return
  }

  pageLoading.value = true
  try {
    const res = await getFeedbackDetailApi(id)
    if (res.code === 0) {
      feedbackInfo.value = res.data
    }
  } catch (error) {
    ElMessage.error("获取反馈详情失败")
    console.error(error)
  } finally {
    pageLoading.value = false
  }
}

// 类型标签颜色
type TagType = "primary" | "success" | "warning" | "info" | "danger"

function getTypeTagType(type: FeedbackType): TagType {
  const typeMap: Record<FeedbackType, TagType> = {
    [FeedbackType.Bug]: "danger",
    [FeedbackType.Suggestion]: "warning",
    [FeedbackType.Other]: "info"
  }
  return typeMap[type] || "info"
}

// 返回列表
function goBack() {
  router.push({ name: "FeedbackList" })
}

// 日志文件下载
const logLoading = ref(false)

async function handleViewLog() {
  if (!feedbackInfo.value?.logUrl) return

  logLoading.value = true
  try {
    const res = await getFileAccessUrlApi(feedbackInfo.value.logUrl)
    if (res.code === 0 && res.data.url) {
      window.open(res.data.url, "_blank")
    } else {
      ElMessage.error("获取日志文件失败")
    }
  } catch (error) {
    ElMessage.error("获取日志文件失败")
    console.error(error)
  } finally {
    logLoading.value = false
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div v-loading="pageLoading" class="app-container">
    <!-- 反馈基本信息区域 -->
    <el-card shadow="never" class="feedback-info-card">
      <div class="feedback-header">
        <div class="feedback-title">
          反馈详情
        </div>
        <div class="feedback-actions">
          <el-button type="primary" link size="small" @click="goBack">
            <el-icon class="el-icon--left">
              <Back />
            </el-icon>返回列表
          </el-button>
        </div>
      </div>

      <template v-if="feedbackInfo">
        <div class="feedback-details">
          <div class="info-row">
            <span class="info-item">
              <span class="label">ID：</span>
              <span class="value">{{ feedbackInfo.id }}</span>
            </span>
            <span class="info-item">
              <span class="label">反馈类型：</span>
              <el-tag :type="getTypeTagType(feedbackInfo.type)" size="small">
                {{ feedbackInfo.typeName }}
              </el-tag>
            </span>
            <span class="info-item">
              <span class="label">创建时间：</span>
              <span class="value">{{ formatDateTime(feedbackInfo.createdAt * 1000) }}</span>
            </span>
          </div>
        </div>

        <!-- 反馈描述 -->
        <div class="feedback-section">
          <div class="section-title">
            反馈描述
          </div>
          <div class="section-content description-content">
            {{ feedbackInfo.description || '无' }}
          </div>
        </div>

        <!-- 图片 -->
        <div class="feedback-section">
          <div class="section-title">
            图片
          </div>
          <div class="section-content">
            <div v-if="feedbackInfo.images && feedbackInfo.images.length > 0" class="images-wrapper">
              <el-image
                v-for="(img, index) in feedbackInfo.images"
                :key="index"
                :src="img"
                :preview-src-list="feedbackInfo.images"
                :initial-index="index"
                fit="cover"
                lazy
                class="feedback-image"
              >
                <template #placeholder>
                  <div class="image-placeholder">
                    <el-icon class="is-loading">
                      <Loading />
                    </el-icon>
                  </div>
                </template>
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>加载失败</span>
                  </div>
                </template>
              </el-image>
            </div>
            <span v-else class="text-gray">无</span>
          </div>
        </div>

        <!-- 日志文件 -->
        <div class="feedback-section">
          <div class="section-title">
            日志文件
          </div>
          <div class="section-content">
            <span
              v-if="feedbackInfo.logUrl"
              class="log-link"
              :class="{ 'is-disabled': logLoading }"
              @click="handleViewLog"
            >
              <el-icon><Document /></el-icon>
              {{ logLoading ? '获取中...' : '点击下载日志' }}
            </span>
            <span v-else class="text-gray">无</span>
          </div>
        </div>

        <!-- 提交者信息 -->
        <div class="feedback-section">
          <div class="section-title">
            提交者信息
          </div>
          <div class="section-content">
            <div class="submitter-info">
              <span class="info-item">
                <span class="label">昵称：</span>
                <span class="value">{{ feedbackInfo.submitterName || '未知' }}</span>
              </span>
              <span class="info-item">
                <span class="label">邮箱：</span>
                <span class="value">{{ feedbackInfo.submitterEmail || '未知' }}</span>
              </span>
            </div>
          </div>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.feedback-info-card {
  margin-bottom: 12px;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.feedback-title {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: #222;
}

.feedback-actions {
  display: flex;
}

/* 信息行样式 */
.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: row;
  min-width: 120px;
  align-items: center;
}

.info-item span {
  font-size: 14px;
  font-weight: 400;
  line-height: 24px;
  color: #666666;
}

.info-item .label {
  margin-right: 4px;
  color: #999;
}

/* 分区样式 */
.feedback-section {
  margin-bottom: 20px;
}

.feedback-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--el-color-primary);
}

.section-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.description-content {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 图片样式 */
.images-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.feedback-image {
  width: 120px;
  height: 120px;
  border-radius: 4px;
  cursor: pointer;
}

/* 图片加载占位 */
.image-placeholder,
.image-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  border-radius: 4px;
  color: #909399;
}

.image-placeholder .el-icon {
  font-size: 24px;
}

.image-error .el-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.image-error span {
  font-size: 12px;
}

/* 加载动画 */
.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.text-gray {
  color: #909399;
}

/* 日志链接样式 */
.log-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
  cursor: pointer;
  transition: color 0.2s;
}

.log-link:hover {
  color: var(--el-color-primary-light-3);
}

.log-link.is-disabled {
  color: #909399;
  cursor: default;
  pointer-events: none;
}

/* 提交者信息 */
.submitter-info {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
}
</style>
