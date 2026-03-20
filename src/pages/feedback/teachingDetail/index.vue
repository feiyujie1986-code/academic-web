<script lang="ts" setup>
import type { TeachingFeedbackDataModel } from "@/api/feedback/teachingFeedback"
import { formatDateTime } from "@@/utils/datetime"
import { getTeachingFeedbackDetailApi } from "@/api/feedback/teachingFeedback"

defineOptions({ name: "TeachingFeedbackDetail" })

const route = useRoute()
const router = useRouter()

// 页面状态
const pageLoading = ref(false)
const feedbackInfo = ref<TeachingFeedbackDataModel | null>(null)

// 获取反馈详情
async function fetchDetail() {
  const id = Number(route.params.id)
  if (!id) {
    ElMessage.error("参数错误")
    return
  }

  pageLoading.value = true
  try {
    const res = await getTeachingFeedbackDetailApi(id)
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

// 返回列表
function goBack() {
  router.push({ name: "TeachingFeedbackList" })
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
          教学反馈详情
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
              <span class="label">意见类型：</span>
              <el-tag size="small">{{ feedbackInfo.typeName }}</el-tag>
            </span>
            <span class="info-item">
              <span class="label">创建时间：</span>
              <span class="value">{{ formatDateTime(feedbackInfo.createdAt * 1000) }}</span>
            </span>
          </div>
        </div>

        <!-- 意见描述 -->
        <div class="feedback-section">
          <div class="section-title">
            意见描述
          </div>
          <div class="section-content description-content">
            {{ feedbackInfo.content || '无' }}
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

/* 提交者信息 */
.submitter-info {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
}
</style>
