<script lang="ts" setup>
import type { fileMeta } from "@/api/course/lesson"
import fileAudioImg from "@@/assets/images/file-audio.png?url"
import fileDefaultImg from "@@/assets/images/file-default.png?url"
import fileExcelImg from "@@/assets/images/file-excel.png?url"
import filePdfImg from "@@/assets/images/file-pdf.png?url"
import filePptImg from "@@/assets/images/file-ppt.png?url"
import fileTextImg from "@@/assets/images/file-text.png?url"
import fileWordImg from "@@/assets/images/file-word.png?url"
import { ref } from "vue"

// 接收外部传入的文件列表
defineProps<{
  files: fileMeta[]
}>()

// 控制模态框显示状态
const visible = ref(false)

// 打开模态框的方法
function open() {
  visible.value = true
}

// 关闭模态框的方法
function handleClose() {
  visible.value = false
}

// 获取文件图标
function getFileIcon(filename: string): string {
  // 文件类型图标映射
  const fileIconMap = new Map<string, string>([
    ["doc", fileWordImg],
    ["docx", fileWordImg],
    ["xls", fileExcelImg],
    ["xlsx", fileExcelImg],
    ["ppt", filePptImg],
    ["pptx", filePptImg],
    ["pdf", filePdfImg],
    ["txt", fileTextImg],
    ["mp3", fileAudioImg],
    ["wav", fileAudioImg]
  ])
  const ext = filename.split(".").pop()?.toLowerCase()
  return fileIconMap.get(ext || "") || fileDefaultImg
}

// 格式化文件大小
function formatFileSize(size: number): string {
  if (size === 0) return "0 KB"

  const units = ["B", "KB", "MB", "GB"]
  let unitIndex = 0
  let formattedSize = size

  while (formattedSize >= 1024 && unitIndex < units.length - 1) {
    formattedSize /= 1024
    unitIndex++
  }

  return `${formattedSize.toFixed(1)} ${units[unitIndex]}`
}

// 处理文件点击事件
function handleFileClick(file: fileMeta) {
  // 这里可以添加打开文件的逻辑
  // ElMessage.info(`点击了文件：${file.filename}`)
  console.log(`点击了文件：${file.filename}`)
  // 示例：下载文件
  // window.open(`${path}/file/download?fullpath=${encodeURIComponent(file.fullpath)}`)
}

// 暴露给外部使用的API
defineExpose({
  open,
  close: handleClose
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`附件 (${files?.length || 0})`"
    width="600px"
    @close="handleClose"
  >
    <div class="attachment-list">
      <div
        v-for="(file, index) in files || []"
        :key="index"
        class="attachment-item"
        @click="handleFileClick(file)"
      >
        <div class="file-icon">
          <img
            :src="getFileIcon(file.filename)"
            alt="文件图标"
            class="icon-img"
          >
        </div>
        <div class="file-info">
          <div class="file-name">
            {{ file.filename }}
          </div>
          <div class="file-size">
            {{ formatFileSize(file.size) }}
          </div>
        </div>
      </div>
      <!-- 空状态提示 -->
      <div v-if="!(files && files.length)" class="empty-state">
        <i class="el-icon el-icon-document" />
        <span>暂无附件</span>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.attachment-list {
  max-height: 400px;
  overflow-y: auto;
}

.attachment-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f7fa;
  }
}

.file-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
}

.icon-img {
  width: 100%;
  height: 100%;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: #303133;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.file-size {
  font-size: 12px;
  color: #909399;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}
</style>
