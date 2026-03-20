<script lang="ts" setup>
import type { fileMeta, LessonItem } from "@/api/course/lesson"
import { dayjs, ElMessage } from "element-plus"
import CustomText from "@/common/components/CustomText/index.vue"
import RichTextViewer from "./RichTextViewer.vue"
import { copyToClipboard as copyToClipboardRaw, LessonType } from "./tools"

const { lesson, isClass } = defineProps<{ lesson: LessonItem, isClass?: boolean }>()
const emit = defineEmits(["viewAttachments"])

function copyToClipboard(text: string) {
  if (!text) {
    ElMessage.warning("没有可复制的内容")
    return
  }
  copyToClipboardRaw(text)
    .then(() => ElMessage.success("链接已复制到剪贴板"))
    .catch(() => ElMessage.error("复制失败"))
}

function handleViewAttachments(files: fileMeta[] | undefined) {
  if (files && files.length > 0) emit("viewAttachments", files)
}
</script>

<template>
  <div class="lesson-detail" :class="{ 'lesson-detail-warning': lesson.status === 0 && isClass }">
    <el-icon v-if="lesson.status === 0 && isClass" class="warning-icon">
      <WarningFilled />
    </el-icon>
    <div class="lesson-content">
      <!-- 课节名称 - 所有类型都有 -->
      <div class="grid-item">
        <span class="grid-item-label">课节名称：</span>
        <span class="grid-item-value">
          <CustomText :content="lesson.name" />
        </span>
      </div>

      <!-- 录播视频 - 仅 Video -->
      <div v-if="lesson.lessonType === LessonType.Video" class="grid-item">
        <span class="grid-item-label">录播视频：</span>
        <span class="grid-item-value">
          <el-tooltip :content="lesson.videoFile?.filename" placement="top" :disabled="!lesson.videoFile?.filename">
            <el-text class="w-150px mb-2" size="small" truncated>{{ lesson.videoFile?.filename }}</el-text>
          </el-tooltip>
          <!-- 转码成功 -->
          <el-tooltip v-if="lesson.videoFile?.transcodeStatus === 'completed'" content="转码成功" placement="top">
            <el-icon style="color: var(--el-color-success); margin-left: 5px; cursor: pointer;">
              <CircleCheckFilled />
            </el-icon>
          </el-tooltip>
          <!-- 转码中 -->
          <el-tooltip v-else-if="lesson.videoFile?.transcodeStatus === 'pending' || lesson.videoFile?.transcodeStatus === 'processing'" content="转码中" placement="top">
            <el-icon class="is-loading" style="color: var(--el-color-warning); margin-left: 5px; cursor: pointer;">
              <Refresh />
            </el-icon>
          </el-tooltip>
          <!-- 转码失败 -->
          <el-tooltip v-else-if="lesson.videoFile?.transcodeStatus === 'failed'" content="转码失败" placement="top">
            <el-icon style="color: var(--el-color-danger); margin-left: 5px; cursor: pointer;">
              <CircleCloseFilled />
            </el-icon>
          </el-tooltip>
        </span>
      </div>

      <!-- 直播链接 - 仅 Live -->
      <div v-if="lesson.lessonType === LessonType.Live" class="grid-item">
        <span class="grid-item-label">直播链接：</span>
        <span class="grid-item-value">
          <el-text class="w-150px mb-2" size="small" truncated>{{ lesson.liveLink }}</el-text>
          <el-icon style="cursor: pointer; margin-left: 5px;" @click="copyToClipboard(lesson.liveLink)"><DocumentCopy /></el-icon>
        </span>
      </div>

      <!-- 讨论方式 - 仅 Discuss -->
      <div v-if="lesson.lessonType === LessonType.Discuss" class="grid-item">
        <span class="grid-item-label">讨论方式：</span>
        <span v-if="lesson.discussMode === 1" class="grid-item-value">
          <el-text class="w-150px mb-2" size="small" truncated>zoom {{ lesson.liveLink }}</el-text>
          <el-icon style="cursor: pointer; margin-left: 5px;" @click="copyToClipboard(lesson.liveLink)"><DocumentCopy /></el-icon>
        </span>
        <span v-else-if="lesson.discussMode === 2" class="grid-item-value">群组讨论</span>
      </div>

      <!-- 作业内容 - 仅 Work -->
      <div v-if="lesson.lessonType === LessonType.Work" class="grid-item">
        <span class="grid-item-label">作业内容：</span>
        <span v-if="lesson.attachments?.length > 0" class="grid-item-value">
          <el-button type="primary" link size="small" @click="handleViewAttachments(lesson.attachments)">
            查看作业内容({{ lesson.attachments?.length }})
          </el-button>
        </span>
        <span v-else class="grid-item-value">-</span>
      </div>

      <!-- 课节内容/作业要求 - 除了 Work 外都显示"课节内容"，Work 显示"作业要求" -->
      <div class="grid-item">
        <span class="grid-item-label">{{ lesson.lessonType === LessonType.Work ? '作业要求：' : '课节内容：' }}</span>
        <span v-if="lesson.content" class="grid-item-value">
          <RichTextViewer
            :content="lesson.content"
            :title="lesson.lessonType === LessonType.Work ? '作业要求' : '课节内容'"
            :button-text="lesson.lessonType === LessonType.Work ? '查看作业要求' : '查看课节内容'"
          />
        </span>
        <span v-else class="grid-item-value">-</span>
      </div>

      <!-- 时区 - 所有类型都有 -->
      <div class="grid-item">
        <span class="grid-item-label">时区：</span>
        <span class="grid-item-value">{{ lesson.timeZone }}</span>
      </div>

      <!-- 课节日期 - 所有类型都有，但格式不同 -->
      <div class="grid-item">
        <span class="grid-item-label">{{ [LessonType.Video, LessonType.Text, LessonType.Work].includes(lesson.lessonType) ? '课节时间：' : '开始时间：' }}</span>
        <span class="grid-item-value">
          <!-- Video/Text/Work 显示日期范围 -->
          <template v-if="[LessonType.Video, LessonType.Text, LessonType.Work].includes(lesson.lessonType)">
            {{ lesson.startTime && dayjs(lesson.startTime).format("YYYY-MM-DD") }} - {{ lesson.endTime && dayjs(lesson.endTime).format("YYYY-MM-DD") }}
          </template>
          <!-- Live/Discuss 只显示开始日期 -->
          <template v-else>
            {{ lesson.startTime && dayjs(lesson.startTime).format("YYYY-MM-DD HH:mm:ss") }}
          </template>
        </span>
      </div>

      <!-- 课节时长 - Live/Discuss -->
      <div v-if="[LessonType.Live, LessonType.Discuss].includes(lesson.lessonType)" class="grid-item">
        <span class="grid-item-label">课节时长：</span>
        <span class="grid-item-value">{{ lesson.duration }}min</span>
      </div>

      <!-- 大使 - 所有类型都有 -->
      <div class="grid-item">
        <span class="grid-item-label">大使：</span>
        <span class="grid-item-value">{{ lesson.seniorTeacherName || '-' }}</span>
      </div>

      <!-- 教师 - 所有类型都有 -->
      <div class="grid-item">
        <span class="grid-item-label">教师：</span>
        <span class="grid-item-value">{{ lesson.teacherName || '-' }}</span>
      </div>

      <!-- 教学备注 - Video/Text/Live/Discuss（Work 没有） -->
      <div v-if="lesson.lessonType !== LessonType.Work" class="grid-item">
        <span class="grid-item-label">教学备注：</span>
        <span class="grid-item-value">
          <CustomText :content="lesson.remark" />
        </span>
      </div>

      <!-- 附件 - 除 Work 外都有（Work 的附件在"作业内容"中展示） -->
      <div v-if="lesson.lessonType !== LessonType.Work" class="grid-item">
        <span class="grid-item-label">附件：</span>
        <span v-if="lesson.attachments?.length > 0" class="grid-item-value">
          <el-button type="primary" link size="small" @click="handleViewAttachments(lesson.attachments)">
            查看附件({{ lesson.attachments?.length }})
          </el-button>
        </span>
        <span v-else class="grid-item-value">-</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.lesson-detail {
  width: 100%;
  padding: 16px;
  padding-left: 0;
  box-sizing: border-box;
  border-bottom-left-radius: 4px;
  background-color: #f6f7fb;
  border-right: 1px solid #d9d9d9;
  position: relative;

  &.lesson-detail-warning {
    background-color: #fef0f0;
  }
}

.warning-icon {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 20px;
  color: #f56c6c;
}

.lesson-content {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  margin-top: -8px;
}

.grid-item {
  box-sizing: border-box;
  width: 25%;
  height: 30px;
  padding-top: 8px;
  display: flex;
  align-items: flex-start;
}

.grid-item-label {
  width: 80px;
  font-size: 12px;
  font-weight: 400;
  color: #666;
  line-height: 22px;
  text-align: right;
}

.grid-item-value {
  flex: 1;
  font-size: 12px;
  font-weight: 400;
  color: #222;
  text-align: left;
  line-height: 22px;
  display: flex;
  align-items: center;
}

.live-link-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.filename-text {
  max-width: 200px; // 约16个汉字或28个英文字母
  display: inline-block;
}
</style>
