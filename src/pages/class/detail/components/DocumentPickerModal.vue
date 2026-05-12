<script lang="ts" setup>
import type { CategoryResponse } from "@/api/document/category"
import type { DocumentResponse } from "@/api/document/document"
import type { fileMeta } from "@/api/course/lesson"
import { ElMessage } from "element-plus"
import { computed, ref, watch } from "vue"
import { getAllCategories } from "@/api/document/category"
import { getDocuments } from "@/api/document/document"
import { formatFileSize, getFilePngIcon } from "@@/utils/fileIcon"

const props = defineProps<{
  visible: boolean
  excludeFullpaths: string[] // 已添加的文件路径，禁止重复选取
  limit: number // 本次最多可选数量
  allowedExtensions?: string[] // 若设置，仅该扩展名的文件可被选取
}>()

function isExtensionAllowed(filename: string) {
  if (!props.allowedExtensions || props.allowedExtensions.length === 0) return true
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  return props.allowedExtensions.includes(ext)
}

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void
  (e: "confirm", files: fileMeta[]): void
}>()

// ──────────── State ────────────
const loading = ref(false)
const keyword = ref("")
const currentCategoryId = ref<number | undefined>(undefined)
const currentParentId = ref<number | undefined>(undefined)
const breadcrumb = ref<Array<{ id: number | undefined, name: string }>>([
  { id: undefined, name: "全部" }
])
const documents = ref<DocumentResponse[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 15
const categories = ref<CategoryResponse[]>([])

// 已选 fullpath → DocumentResponse
const selectedMap = ref<Map<string, DocumentResponse>>(new Map())

// ──────────── Computed ────────────
const selectedCount = computed(() => selectedMap.value.size)

function isExcluded(doc: DocumentResponse) {
  return !!doc.file && props.excludeFullpaths.includes(doc.file.fullpath)
}

function isSelected(doc: DocumentResponse) {
  return !!doc.file && selectedMap.value.has(doc.file.fullpath)
}

function isFormatDisabled(doc: DocumentResponse) {
  return doc.type === 2 && !isExtensionAllowed(doc.name)
}

function isVideoTranscoding(doc: DocumentResponse) {
  return doc.video?.transcodeStatus === "pending" || doc.video?.transcodeStatus === "processing"
}

function isDisabled(doc: DocumentResponse) {
  if (doc.type !== 2) return false
  if (isExcluded(doc)) return true
  if (isFormatDisabled(doc)) return true
  if (isVideoTranscoding(doc)) return true // 转码中不可选，视频未就绪
  // 达到上限且当前项未被选中
  if (selectedCount.value >= props.limit && !isSelected(doc)) return true
  return false
}

// ──────────── Lifecycle ────────────
watch(() => props.visible, (val) => {
  if (val) init()
})

async function init() {
  selectedMap.value = new Map()
  keyword.value = ""
  currentCategoryId.value = undefined
  currentParentId.value = undefined
  breadcrumb.value = [{ id: undefined, name: "全部" }]
  currentPage.value = 1
  await Promise.all([loadCategories(), loadDocuments()])
}

// ──────────── Data Loading ────────────
async function loadCategories() {
  const res = await getAllCategories()
  if (res.code === 0) categories.value = res.data
}

async function loadDocuments() {
  loading.value = true
  try {
    const res = await getDocuments({
      page: currentPage.value,
      pageSize,
      parentId: currentParentId.value,
      categoryId: currentCategoryId.value,
      keyword: keyword.value || undefined
    })
    if (res.code === 0) {
      documents.value = res.data.list
      total.value = res.data.total
    }
  }
  finally {
    loading.value = false
  }
}

// ──────────── Navigation ────────────
function onSearch() {
  currentPage.value = 1
  loadDocuments()
}

function onCategoryChange() {
  currentPage.value = 1
  currentParentId.value = undefined
  breadcrumb.value = [{ id: undefined, name: "全部" }]
  keyword.value = ""
  loadDocuments()
}

function enterFolder(doc: DocumentResponse) {
  if (doc.type !== 1) return
  currentParentId.value = doc.id
  breadcrumb.value.push({ id: doc.id, name: doc.name })
  currentPage.value = 1
  keyword.value = ""
  loadDocuments()
}

function navigateTo(index: number) {
  breadcrumb.value = breadcrumb.value.slice(0, index + 1)
  currentParentId.value = breadcrumb.value[index].id
  currentPage.value = 1
  keyword.value = ""
  loadDocuments()
}

function onPageChange(page: number) {
  currentPage.value = page
  loadDocuments()
}

// ──────────── Selection ────────────
function toggleSelect(doc: DocumentResponse) {
  if (doc.type !== 2 || !doc.file) return
  if (isExcluded(doc) || isFormatDisabled(doc)) return

  const key = doc.file.fullpath
  if (selectedMap.value.has(key)) {
    selectedMap.value.delete(key)
  }
  else {
    if (selectedCount.value >= props.limit) {
      ElMessage.warning(`最多还可选 ${props.limit} 个文件`)
      return
    }
    selectedMap.value.set(key, doc)
  }
  // 触发响应式更新
  selectedMap.value = new Map(selectedMap.value)
}

// ──────────── Confirm / Close ────────────
function handleConfirm() {
  const result: fileMeta[] = Array.from(selectedMap.value.values())
    .filter(d => d.file)
    .map(d => ({
      filename: d.file!.filename,
      fullpath: d.file!.fullpath,
      size: d.file!.size,
      md5: d.file!.md5
    }))
  emit("confirm", result)
  emit("update:visible", false)
}

function handleClose() {
  emit("update:visible", false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="从资料中心选取"
    width="680px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 搜索 + 分类 -->
    <div class="picker-toolbar">
      <el-select
        v-model="currentCategoryId"
        clearable
        placeholder="全部分类"
        class="picker-category"
        @change="onCategoryChange"
      >
        <el-option
          v-for="cat in categories"
          :key="cat.id"
          :label="cat.name"
          :value="cat.id"
        />
      </el-select>
      <el-input
        v-model="keyword"
        placeholder="搜索文件名"
        clearable
        class="picker-search"
        @keyup.enter="onSearch"
        @clear="onSearch"
      >
        <template #append>
          <el-button @click="onSearch">
            <el-icon><Search /></el-icon>
          </el-button>
        </template>
      </el-input>
    </div>

    <!-- 面包屑 -->
    <el-breadcrumb separator="/" class="picker-breadcrumb">
      <el-breadcrumb-item
        v-for="(crumb, index) in breadcrumb"
        :key="index"
        :class="{ 'is-last': index === breadcrumb.length - 1 }"
        @click="index < breadcrumb.length - 1 && navigateTo(index)"
      >
        {{ crumb.name }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <!-- 文件列表 -->
    <div v-loading="loading" class="picker-list">
      <div v-if="documents.length === 0 && !loading" class="picker-empty">
        <el-empty description="暂无文件" :image-size="60" />
      </div>

      <div
        v-for="doc in documents"
        :key="doc.id"
        class="picker-item"
        :class="{
          'is-folder': doc.type === 1,
          'is-selected': isSelected(doc),
          'is-disabled': isDisabled(doc),
          'is-excluded': isExcluded(doc),
        }"
        @click="doc.type === 1 ? enterFolder(doc) : toggleSelect(doc)"
      >
        <!-- 文件夹 -->
        <template v-if="doc.type === 1">
          <el-icon class="item-folder-icon"><Folder /></el-icon>
          <span class="item-name">{{ doc.name }}</span>
          <el-icon class="item-arrow"><ArrowRight /></el-icon>
        </template>

        <!-- 文件 -->
        <template v-else>
          <el-checkbox
            :model-value="isSelected(doc)"
            :disabled="isDisabled(doc)"
            class="item-checkbox"
            @click.stop
            @change="toggleSelect(doc)"
          />
          <img :src="getFilePngIcon(doc.name)" class="item-file-icon" alt="">
          <span class="item-name" :title="doc.name">{{ doc.name }}</span>
          <!-- 视频转码状态（与录播课样式一致） -->
          <template v-if="doc.video">
            <el-tooltip v-if="doc.video.transcodeStatus === 'completed'" content="转码成功" placement="top">
              <el-icon class="item-transcode-icon" style="color: var(--el-color-success);">
                <CircleCheckFilled />
              </el-icon>
            </el-tooltip>
            <el-tooltip v-else-if="doc.video.transcodeStatus === 'pending' || doc.video.transcodeStatus === 'processing'" content="转码中" placement="top">
              <el-icon class="item-transcode-icon is-loading" style="color: var(--el-color-warning);">
                <Refresh />
              </el-icon>
            </el-tooltip>
            <el-tooltip v-else-if="doc.video.transcodeStatus === 'failed'" content="转码失败" placement="top">
              <el-icon class="item-transcode-icon" style="color: var(--el-color-danger);">
                <CircleCloseFilled />
              </el-icon>
            </el-tooltip>
          </template>
          <span class="item-size">{{ doc.file ? formatFileSize(doc.file.size) : '-' }}</span>
          <span v-if="isExcluded(doc)" class="item-tag-excluded">已添加</span>
          <span v-else-if="isFormatDisabled(doc)" class="item-tag-disabled">格式不支持</span>
          <span v-else-if="isVideoTranscoding(doc)" class="item-tag-disabled">转码中</span>
        </template>
      </div>
    </div>

    <!-- 分页 -->
    <el-pagination
      v-if="total > pageSize"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next"
      small
      class="picker-pagination"
      @current-change="onPageChange"
    />

    <template #footer>
      <span class="picker-footer">
        <span class="picker-footer-hint">
          已选 {{ selectedCount }} 个，还可选 {{ limit - selectedCount }} 个
        </span>
        <div>
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" :disabled="selectedCount === 0" @click="handleConfirm">
            确认选取
          </el-button>
        </div>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.picker-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;

  .picker-category {
    width: 140px;
    flex-shrink: 0;
  }

  .picker-search {
    flex: 1;
  }
}

.picker-breadcrumb {
  margin-bottom: 8px;
  font-size: 13px;

  :deep(.el-breadcrumb__item) {
    cursor: pointer;

    &.is-last .el-breadcrumb__inner {
      color: var(--el-text-color-primary);
      cursor: default;
      font-weight: 500;
    }
  }
}

.picker-list {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  min-height: 320px;
  max-height: 360px;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover:not(.is-disabled) {
    background-color: var(--el-fill-color-light);
  }

  &.is-selected {
    background-color: var(--el-color-primary-light-9);
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &.is-folder:hover {
    background-color: var(--el-fill-color-light);
  }

  .item-checkbox {
    flex-shrink: 0;
  }

  .item-folder-icon {
    font-size: 20px;
    color: #e6a23c;
    flex-shrink: 0;
  }

  .item-file-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    object-fit: contain;
  }

  .item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: var(--el-text-color-primary);
  }

  .item-transcode-icon {
    flex-shrink: 0;
    cursor: pointer;
    font-size: 15px;
  }

  .item-size {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
    min-width: 60px;
    text-align: right;
  }

  .item-arrow {
    color: var(--el-text-color-placeholder);
    flex-shrink: 0;
  }

  .item-tag-excluded {
    font-size: 11px;
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    padding: 1px 6px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .item-tag-disabled {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    background: var(--el-fill-color);
    padding: 1px 6px;
    border-radius: 10px;
    flex-shrink: 0;
  }
}

.picker-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 320px;
}

.picker-pagination {
  margin-top: 10px;
  justify-content: center;
  display: flex;
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .picker-footer-hint {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
</style>