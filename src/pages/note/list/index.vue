<script lang="ts" setup>
import type { NoteComment, NoteListItem, VisibilityDetail } from "@/api/note/note"
import type { MemberSearchItem } from "@/api/member/memberSearch"
import { searchMembersApi } from "@/api/member/memberSearch"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import {
  deleteNoteApi,
  deleteNoteCommentApi,
  getNoteCommentsApi,
  getNoteDetailApi,
  getNoteListApi,
  NoteStatusMap,
  updateNoteStatusApi,
  VisibilityMap
} from "@/api/note/note"

defineOptions({ name: "NoteList" })

// ========== 搜索表单 ==========
const searchFormData = reactive({
  title: "",
  userId: undefined as number | undefined,
  status: undefined as number | undefined
})

const statusOptions = [
  { value: 1, label: "正常" },
  { value: 2, label: "已屏蔽" }
]

function handleSearch() {
  paginationData.currentPage = 1
  getTableData()
}

function resetSearch() {
  searchFormData.title = ""
  searchFormData.userId = undefined
  searchFormData.status = undefined
  memberSearchOptions.value = []
  handleSearch()
}

// ========== 发布人昵称搜索 ==========
const memberSearchOptions = ref<MemberSearchItem[]>([])
const memberSearchLoading = ref(false)
let memberSearchTimer: ReturnType<typeof setTimeout> | null = null

function handleMemberSearch(query: string) {
  if (memberSearchTimer) clearTimeout(memberSearchTimer)
  if (!query) {
    memberSearchOptions.value = []
    return
  }
  memberSearchTimer = setTimeout(async () => {
    memberSearchLoading.value = true
    try {
      const res = await searchMembersApi({ nickname: query, page: 1, pageSize: 20 })
      if (res.code === 0) {
        memberSearchOptions.value = res.data.list
      }
    } catch (error) {
      console.error(error)
    } finally {
      memberSearchLoading.value = false
    }
  }, 300)
}

// ========== 表格数据 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()
const loading = ref(false)
const tableData = ref<NoteListItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getNoteListApi({
      title: searchFormData.title || undefined,
      userId: searchFormData.userId || undefined,
      status: searchFormData.status || undefined,
      page: paginationData.currentPage,
      pageSize: paginationData.pageSize
    })
    if (res.code === 0) {
      tableData.value = res.data.list
      paginationData.total = res.data.total
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

getTableData()

function handleSizeChange(value: number) {
  changePageSize(value)
  getTableData()
}

function handleCurrentChange(value: number) {
  changeCurrentPage(value)
  getTableData()
}

// ========== 可见性展示 ==========
function getVisibilityLabel(visibility: number, detail?: VisibilityDetail | null): string {
  const label = VisibilityMap[visibility] || String(visibility)
  if (visibility === 4 && detail?.classes?.length) {
    return `${label}（${detail.classes.map(c => c.name).join("、")}）`
  }
  if (visibility === 6 && detail?.members?.length) {
    return `${label}（${detail.members.map(m => m.nickname).join("、")}）`
  }
  return label
}

// ========== 媒体统计 ==========
function getMediaSummary(mediaList: NoteListItem["mediaList"]) {
  const images = mediaList.filter(m => m.type === 1).length
  const videos = mediaList.filter(m => m.type === 2).length
  const parts: string[] = []
  if (images > 0) parts.push(`🖼 ${images}张`)
  if (videos > 0) parts.push(`▶ ${videos}个`)
  return parts.join(" ") || "-"
}

// ========== 屏蔽操作 ==========
const blockLoading = ref<number | null>(null)

async function handleBlock(row: NoteListItem) {
  try {
    await ElMessageBox.confirm("屏蔽后用户将无法查看该内容。", "确认屏蔽该笔记？", {
      confirmButtonText: "确认屏蔽",
      cancelButtonText: "取消",
      type: "warning"
    })
    blockLoading.value = row.id
    const res = await updateNoteStatusApi(row.id, 2)
    if (res.code === 0) {
      ElMessage.success("屏蔽成功")
      getTableData()
      if (drawerVisible.value && drawerNote.value?.id === row.id) {
        drawerNote.value.status = 2
      }
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    blockLoading.value = null
  }
}

// ========== 恢复操作 ==========
const restoreLoading = ref<number | null>(null)

async function handleRestore(row: NoteListItem) {
  restoreLoading.value = row.id
  try {
    const res = await updateNoteStatusApi(row.id, 1)
    if (res.code === 0) {
      ElMessage.success("恢复成功")
      getTableData()
      if (drawerVisible.value && drawerNote.value?.id === row.id) {
        drawerNote.value.status = 1
      }
    }
  } catch (error) {
    console.error(error)
  } finally {
    restoreLoading.value = null
  }
}

// ========== 删除操作 ==========
const deleteLoading = ref<number | null>(null)

async function handleDelete(row: NoteListItem) {
  try {
    await ElMessageBox.confirm(
      "删除后无法恢复，同时会删除该笔记下的所有媒体文件。",
      "确认删除该笔记？",
      {
        confirmButtonText: "确认删除",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
    deleteLoading.value = row.id
    const res = await deleteNoteApi(row.id)
    if (res.code === 0) {
      ElMessage.success("删除成功")
      if (drawerVisible.value && drawerNote.value?.id === row.id) {
        drawerVisible.value = false
      }
      getTableData()
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    deleteLoading.value = null
  }
}

// ========== 详情抽屉 ==========
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const drawerNote = ref<NoteListItem | null>(null)

async function handleDetail(row: NoteListItem) {
  drawerVisible.value = true
  drawerLoading.value = true
  commentsExpanded.value = false
  comments.value = []
  try {
    const res = await getNoteDetailApi(row.id)
    if (res.code === 0) {
      drawerNote.value = res.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    drawerLoading.value = false
  }
}

// 抽屉内屏蔽/恢复
async function handleDrawerBlock() {
  if (!drawerNote.value) return
  await handleBlock(drawerNote.value)
}

async function handleDrawerRestore() {
  if (!drawerNote.value) return
  await handleRestore(drawerNote.value)
}

// ========== 媒体预览 ==========
const previewVisible = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const videoModalVisible = ref(false)
const videoUid = ref("")

function handlePreviewImage(mediaList: NoteListItem["mediaList"], index: number) {
  previewImages.value = mediaList.filter(m => m.type === 1).map(m => m.url)
  // 计算在图片列表中的索引
  const imageIndex = mediaList.filter((m, i) => m.type === 1 && i <= index).length - 1
  previewIndex.value = Math.max(0, imageIndex)
  previewVisible.value = true
}

function handlePlayVideo(uid: string) {
  videoUid.value = uid
  videoModalVisible.value = true
}

// ========== 评论 ==========
const commentsExpanded = ref(false)
const commentsLoading = ref(false)
const comments = ref<NoteComment[]>([])
const commentTotal = ref(0)
const commentPage = ref(1)
const commentPageSize = 10

async function toggleComments() {
  if (commentsExpanded.value) {
    commentsExpanded.value = false
    return
  }
  commentsExpanded.value = true
  await loadComments(1)
}

async function loadComments(page: number) {
  if (!drawerNote.value) return
  commentsLoading.value = true
  try {
    const res = await getNoteCommentsApi(drawerNote.value.id, { page, pageSize: commentPageSize })
    if (res.code === 0) {
      comments.value = res.data.list
      commentTotal.value = res.data.total
      commentPage.value = page
    }
  } catch (error) {
    console.error(error)
  } finally {
    commentsLoading.value = false
  }
}

const deleteCommentLoading = ref<number | null>(null)

async function handleDeleteComment(comment: NoteComment) {
  if (!drawerNote.value) return
  try {
    await ElMessageBox.confirm("删除后无法恢复。", "确认删除该评论？", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })
    deleteCommentLoading.value = comment.id
    const res = await deleteNoteCommentApi(drawerNote.value.id, comment.id)
    if (res.code === 0) {
      ElMessage.success("删除成功")
      await loadComments(commentPage.value)
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    deleteCommentLoading.value = null
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索卡片 -->
    <el-card shadow="never" class="search-wrapper">
      <el-form :inline="true" :model="searchFormData">
        <el-form-item label="笔记标题">
          <el-input
            v-model="searchFormData.title"
            placeholder="请输入标题"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="发布人">
          <el-select
            v-model="searchFormData.userId"
            filterable
            remote
            clearable
            :remote-method="handleMemberSearch"
            :loading="memberSearchLoading"
            placeholder="昵称模糊搜索"
            style="width: 200px"
          >
            <el-option
              v-for="item in memberSearchOptions"
              :key="item.id"
              :label="item.nickname"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchFormData.status"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">
            查询
          </el-button>
          <el-button icon="Refresh" @click="resetSearch">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格卡片 -->
    <el-card v-loading="loading" shadow="never">
      <div class="toolbar-wrapper">
        <div />
        <el-tooltip content="刷新" effect="light">
          <el-button type="primary" icon="RefreshRight" circle plain @click="getTableData" />
        </el-tooltip>
      </div>

      <div class="table-wrapper">
        <el-table :data="tableData" style="width: 100%" row-key="id">
          <!-- 标题 -->
          <el-table-column label="标题" width="200">
            <template #default="{ row }">
              <el-tooltip :content="row.title" placement="top" :show-after="500">
                <span class="title-text">{{ row.title }}</span>
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- 发布人 -->
          <el-table-column label="发布人" width="120">
            <template #default="{ row }">
              {{ row.userNickname || `UserID ${row.userId}` }}
            </template>
          </el-table-column>

          <!-- 可见性 -->
          <el-table-column label="可见性" min-width="120">
            <template #default="{ row }">
              <el-tooltip
                v-if="(row.visibility === 4 && row.visibilityDetail?.classes?.length) || (row.visibility === 6 && row.visibilityDetail?.members?.length)"
                :content="getVisibilityLabel(row.visibility, row.visibilityDetail)"
                placement="top"
                :show-after="300"
              >
                <span class="visibility-text">{{ getVisibilityLabel(row.visibility, row.visibilityDetail) }}</span>
              </el-tooltip>
              <span v-else>{{ VisibilityMap[row.visibility] || row.visibility }}</span>
            </template>
          </el-table-column>

          <!-- 媒体 -->
          <el-table-column label="媒体" width="110">
            <template #default="{ row }">
              {{ getMediaSummary(row.mediaList || []) }}
            </template>
          </el-table-column>

          <!-- 互动数 -->
          <el-table-column label="互动数" width="130">
            <template #default="{ row }">
              <span class="interaction-cell">
                👍{{ row.likeCount }} 💬{{ row.commentCount }} ⭐{{ row.favoriteCount }}
              </span>
            </template>
          </el-table-column>

          <!-- 状态 -->
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ NoteStatusMap[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 发布时间 -->
          <el-table-column label="发布时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt * 1000) }}
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" fixed="right" width="170">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleDetail(row)">
                详情
              </el-button>
              <el-button
                v-if="row.status === 1"
                type="warning"
                link
                :loading="blockLoading === row.id"
                @click="handleBlock(row)"
              >
                屏蔽
              </el-button>
              <el-button
                v-else
                type="primary"
                link
                :loading="restoreLoading === row.id"
                @click="handleRestore(row)"
              >
                恢复
              </el-button>
              <el-button
                type="danger"
                link
                :loading="deleteLoading === row.id"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pager-wrapper">
        <el-pagination
          background
          :layout="paginationData.layout"
          :page-sizes="paginationData.pageSizes"
          :total="paginationData.total"
          :page-size="paginationData.pageSize"
          :current-page="paginationData.currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="笔记详情"
      :size="600"
      direction="rtl"
      destroy-on-close
    >
      <div v-loading="drawerLoading" class="drawer-content">
        <template v-if="drawerNote">
          <!-- 基本信息 -->
          <el-descriptions :column="2" border class="note-desc">
            <el-descriptions-item label="标题" :span="2">
              {{ drawerNote.title }}
            </el-descriptions-item>
            <el-descriptions-item label="发布人">
              {{ drawerNote.userNickname || `UserID ${drawerNote.userId}` }}
            </el-descriptions-item>
            <el-descriptions-item label="发布时间">
              {{ formatDateTime(drawerNote.createdAt * 1000) }}
            </el-descriptions-item>
            <el-descriptions-item label="可见性" :span="2">
              <div class="visibility-detail">
                <span class="visibility-label">{{ VisibilityMap[drawerNote.visibility] || drawerNote.visibility }}</span>

                <!-- 指定群：tag 展示群名 -->
                <template v-if="drawerNote.visibility === 4 && drawerNote.visibilityDetail?.classes?.length">
                  <div class="detail-class-list">
                    <el-tag
                      v-for="cls in drawerNote.visibilityDetail.classes"
                      :key="cls.id"
                      size="small"
                      type="info"
                    >
                      {{ cls.name }}
                    </el-tag>
                  </div>
                </template>

                <!-- 指定成员：列表展示昵称 + 账号 -->
                <template v-else-if="drawerNote.visibility === 6 && drawerNote.visibilityDetail?.members?.length">
                  <div class="detail-member-list">
                    <div
                      v-for="member in drawerNote.visibilityDetail.members"
                      :key="member.id"
                      class="detail-member-item"
                    >
                      <span class="member-nickname">{{ member.nickname }}</span>
                      <span class="member-account">{{ member.account }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <div class="status-cell">
                <el-tag :type="drawerNote.status === 1 ? 'success' : 'danger'" size="small">
                  {{ NoteStatusMap[drawerNote.status] }}
                </el-tag>
                <el-button
                  v-if="drawerNote.status === 1"
                  type="warning"
                  size="small"
                  plain
                  style="margin-left: 8px"
                  :loading="blockLoading === drawerNote.id"
                  @click="handleDrawerBlock"
                >
                  屏蔽
                </el-button>
                <el-button
                  v-else
                  type="primary"
                  size="small"
                  plain
                  style="margin-left: 8px"
                  :loading="restoreLoading === drawerNote.id"
                  @click="handleDrawerRestore"
                >
                  恢复
                </el-button>
              </div>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 正文 -->
          <div v-if="drawerNote.content" class="section">
            <div class="section-title">
              正文
            </div>
            <div class="note-content">
              {{ drawerNote.content }}
            </div>
          </div>

          <!-- 媒体 -->
          <div v-if="drawerNote.mediaList && drawerNote.mediaList.length" class="section">
            <div class="section-title">
              媒体（共 {{ drawerNote.mediaList.length }} 项）
            </div>
            <div class="media-list">
              <div
                v-for="(media, idx) in drawerNote.mediaList"
                :key="media.id"
                class="media-item"
                @click="media.type === 1 ? handlePreviewImage(drawerNote.mediaList, idx) : handlePlayVideo(media.videoUid!)"
              >
                <template v-if="media.type === 1">
                  <div class="media-thumb-wrap">
                    <el-image :src="media.url" fit="cover" class="media-thumb">
                      <template #placeholder>
                        <div class="media-thumb image-loading" />
                      </template>
                    </el-image>
                    <span v-if="media.url === drawerNote.coverUrl" class="cover-badge">封面</span>
                  </div>
                  <div v-if="media.width && media.height" class="media-meta">
                    {{ media.width }}×{{ media.height }}
                  </div>
                </template>
                <template v-else>
                  <div class="video-thumb">
                    <el-image v-if="media.url" :src="media.url" fit="cover" class="media-thumb">
                      <template #placeholder>
                        <div class="media-thumb image-loading" />
                      </template>
                    </el-image>
                    <div v-else class="media-thumb video-placeholder" />
                    <div class="play-icon">
                      ▶
                    </div>
                  </div>
                  <div v-if="media.duration" class="media-meta">
                    {{ Math.floor(media.duration / 60).toString().padStart(2, "0") }}:{{ (media.duration % 60).toString().padStart(2, "0") }}
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- 互动数据 -->
          <div class="section">
            <div class="section-title">
              互动数据
            </div>
            <div class="interaction-data">
              <span>👍 点赞 {{ drawerNote.likeCount }}</span>
              <span>👎 点踩 {{ drawerNote.dislikeCount }}</span>
              <span>💬 评论 {{ drawerNote.commentCount }}</span>
              <span>⭐ 收藏 {{ drawerNote.favoriteCount }}</span>
            </div>
          </div>

          <!-- 评论列表 -->
          <div class="section">
            <div class="section-title-row">
              <span class="section-title">评论列表</span>
              <el-button type="primary" link @click="toggleComments">
                {{ commentsExpanded ? "收起" : "展开" }}
              </el-button>
            </div>

            <div v-if="commentsExpanded" v-loading="commentsLoading" class="comments-section">
              <template v-if="comments.length">
                <div
                  v-for="comment in comments"
                  :key="comment.id"
                  class="comment-item"
                  :class="{ 'comment-blocked': comment.status === 2 }"
                >
                  <div class="comment-header">
                    <span class="comment-user">UserID {{ comment.userId }}</span>
                    <span class="comment-time">{{ formatDateTime(comment.createdAt * 1000) }}</span>
                    <el-tag v-if="comment.status === 2" type="info" size="small" style="margin-left: 6px">
                      已屏蔽
                    </el-tag>
                    <el-button
                      type="danger"
                      size="small"
                      link
                      :loading="deleteCommentLoading === comment.id"
                      @click="handleDeleteComment(comment)"
                    >
                      删除
                    </el-button>
                  </div>
                  <div class="comment-content">
                    {{ comment.content }}
                  </div>

                  <!-- 二级回复 -->
                  <div
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    class="reply-item"
                    :class="{ 'comment-blocked': reply.status === 2 }"
                  >
                    <div class="comment-header">
                      <span class="comment-user">UserID {{ reply.userId }} 回复 {{ reply.userId }}</span>
                      <span class="comment-time">{{ formatDateTime(reply.createdAt * 1000) }}</span>
                      <el-tag v-if="reply.status === 2" type="info" size="small" style="margin-left: 6px">
                        已屏蔽
                      </el-tag>
                      <el-button
                        type="danger"
                        size="small"
                        link
                        :loading="deleteCommentLoading === reply.id"
                        @click="handleDeleteComment(reply)"
                      >
                        删除
                      </el-button>
                    </div>
                    <div class="comment-content">
                      {{ reply.content }}
                    </div>
                  </div>
                </div>

                <!-- 评论分页 -->
                <div class="comment-pager">
                  <el-pagination
                    background
                    layout="prev, pager, next"
                    :total="commentTotal"
                    :page-size="commentPageSize"
                    :current-page="commentPage"
                    @current-change="loadComments"
                  />
                  <span class="comment-total">共 {{ commentTotal }} 条</span>
                </div>
              </template>
              <el-empty v-else description="暂无评论" :image-size="60" />
            </div>
          </div>
        </template>
      </div>
    </el-drawer>

    <!-- 图片预览 -->
    <el-image-viewer
      v-if="previewVisible"
      :url-list="previewImages"
      :initial-index="previewIndex"
      @close="previewVisible = false"
    />

    <!-- 视频播放弹窗 -->
    <el-dialog v-model="videoModalVisible" title="视频播放" width="640px" destroy-on-close>
      <div class="video-player-wrapper">
        <iframe
          v-if="videoUid"
          :src="`https://iframe.videodelivery.net/${videoUid}`"
          style="width: 100%; height: 360px; border: none"
          allow="autoplay; fullscreen"
          allowfullscreen
        />
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.search-wrapper {
  margin-bottom: 5px;

  :deep(.el-card__body) {
    padding-bottom: 2px;
  }
}

.toolbar-wrapper {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.table-wrapper {
  margin-bottom: 20px;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
}


.title-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
}

.visibility-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
}

.visibility-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .visibility-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .detail-class-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .detail-member-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-member-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px;
    background: var(--el-fill-color-lighter);
    border-radius: 4px;
    font-size: 13px;

    .member-nickname {
      color: var(--el-text-color-primary);
      font-weight: 500;
    }

    .member-account {
      color: var(--el-text-color-secondary);
    }
  }
}

.interaction-cell {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

// 抽屉内容
.drawer-content {
  padding: 4px 0;
}

.note-desc {
  margin-bottom: 20px;
}

.status-cell {
  display: flex;
  align-items: center;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  .section-title {
    margin-bottom: 0;
  }
}

.note-content {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}

.media-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.media-item {
  cursor: pointer;
  text-align: center;

  .media-thumb-wrap {
    position: relative;
    width: 80px;
    height: 80px;
  }

  .media-thumb {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    display: block;
    object-fit: cover;
  }

  .image-loading {
    background: linear-gradient(90deg, var(--el-fill-color) 25%, var(--el-fill-color-light) 50%, var(--el-fill-color) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }

  .cover-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    font-size: 10px;
    line-height: 1;
    padding: 2px 4px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
  }

  .media-meta {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
  }
}

.video-thumb {
  position: relative;
  width: 80px;
  height: 80px;

  .media-thumb {
    width: 100%;
    height: 100%;
    border-radius: 6px;
  }

  .video-placeholder {
    background-color: var(--el-fill-color);
  }

  .play-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #fff;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
  }
}

.interaction-data {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.comments-section {
  min-height: 60px;
}

.comment-item {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  margin-bottom: 12px;

  &.comment-blocked {
    background: var(--el-fill-color-light);
  }
}

.reply-item {
  margin-top: 10px;
  margin-left: 20px;
  padding: 10px;
  border-left: 3px solid var(--el-border-color);
  border-radius: 0 6px 6px 0;
  background: var(--el-fill-color-lighter);

  &.comment-blocked {
    background: var(--el-fill-color-light);
  }
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;

  .comment-user {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .comment-time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .el-button {
    margin-left: auto;
  }
}

.comment-content {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  word-break: break-all;
}

.comment-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;

  .comment-total {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.video-player-wrapper {
  background: #000;
  border-radius: 4px;
  overflow: hidden;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>