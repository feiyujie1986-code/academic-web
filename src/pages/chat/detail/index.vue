<script lang="ts" setup>
import type { ConversationMember, ConversationModel, MessageItem } from "@/api/im/conversation"
import { formatDateTime } from "@@/utils/datetime"
import { getUserTypeLabelCssStyle } from "@@/utils/userTypeLabel"
import { ElMessage, ElMessageBox } from "element-plus"
import { nextTick, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  deleteConversationMessageApi,
  dissolveConversationApi,
  getConversationDetailApi,
  getConversationMembersApi,
  getConversationMessagesApi,
  muteMemberApi,
  removeConversationMemberApi,
  unmuteMemberApi,
  updateConversationApi
} from "@/api/im/conversation"
import { banUserApi } from "@/api/im/user"

defineOptions({ name: "ChatDetail" })

const route = useRoute()
const router = useRouter()
const conversationId = Number(route.params.id)

// ==================== 群组信息 ====================
const conversation = ref<ConversationModel | null>(null)
const loadingGroup = ref(false)

async function fetchConversation() {
  loadingGroup.value = true
  try {
    const res = await getConversationDetailApi(conversationId)
    if (res.code === 0) {
      conversation.value = res.data
    }
  } finally {
    loadingGroup.value = false
  }
}

// ==================== 全员禁言 ====================
const muteAllLoading = ref(false)

async function toggleMuteAll() {
  if (!conversation.value) return
  const next = conversation.value.muteAll === 1 ? 0 : 1
  muteAllLoading.value = true
  try {
    const res = await updateConversationApi(conversationId, { muteAll: next })
    if (res.code === 0) {
      conversation.value.muteAll = next
      ElMessage.success(next === 1 ? "已开启全员禁言" : "已解除全员禁言")
    }
  } finally {
    muteAllLoading.value = false
  }
}

// ==================== 解散群组 ====================
const dissolveLoading = ref(false)

async function handleDissolve() {
  if (!conversation.value) return
  try {
    await ElMessageBox.confirm(
      `确认解散「${conversation.value.name}」？\n解散后无法恢复，所有成员将收到解散通知。`,
      "解散群组确认",
      {
        confirmButtonText: "确认解散",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    )
    dissolveLoading.value = true
    const res = await dissolveConversationApi(conversationId)
    if (res.code === 0) {
      ElMessage.success("群组已解散")
      router.push("/chat/list")
    }
  } catch {
    // 取消操作
  } finally {
    dissolveLoading.value = false
  }
}

// ==================== 历史消息 ====================
const messages = ref<MessageItem[]>([])
const messageCursor = ref("")
const hasMoreMessages = ref(true)
const loadingMessages = ref(false)
const loadingMoreMessages = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

async function fetchMessages(loadMore = false) {
  if (loadMore) {
    if (!hasMoreMessages.value || loadingMoreMessages.value) return
    loadingMoreMessages.value = true
  } else {
    loadingMessages.value = true
  }

  try {
    const params: { before?: string, limit: number } = { limit: 20 }
    if (loadMore && messageCursor.value) {
      params.before = messageCursor.value
    }

    const res = await getConversationMessagesApi(conversationId, params)
    if (res.code === 0) {
      const { list, cursor, hasMore } = res.data
      hasMoreMessages.value = hasMore
      messageCursor.value = cursor

      // API 返回最新在前，翻转后追加（新消息在 list 末尾）
      const reversed = [...list].reverse()
      if (loadMore) {
        // 保留滚动位置：记录旧高度，加载后还原偏移
        const container = messagesContainer.value
        const prevHeight = container?.scrollHeight ?? 0
        messages.value = [...reversed, ...messages.value]
        await nextTick()
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight
        }
      } else {
        messages.value = reversed
        await nextTick()
        scrollToBottom()
      }
    }
  } finally {
    loadingMessages.value = false
    loadingMoreMessages.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function handleDeleteMessage(messageId: string) {
  try {
    await ElMessageBox.confirm("确认删除该消息？删除后所有人不可见。", "删除消息", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })
    const res = await deleteConversationMessageApi(conversationId, messageId)
    if (res.code === 0) {
      messages.value = messages.value.filter(m => m.id !== messageId)
      ElMessage.success("消息已删除")
    }
  } catch {
    // 取消操作
  }
}

// ==================== 成员列表 ====================
const members = ref<ConversationMember[]>([])
const memberTotal = ref(0)
const memberPage = ref(1)
const memberKeyword = ref("")
const loadingMembers = ref(false)

async function fetchMembers(page = 1) {
  memberPage.value = page
  loadingMembers.value = true
  try {
    const res = await getConversationMembersApi(conversationId, {
      page,
      pageSize: 20,
      keyword: memberKeyword.value || undefined
    })
    if (res.code === 0) {
      members.value = res.data.list
      memberTotal.value = res.data.total
    }
  } finally {
    loadingMembers.value = false
  }
}

function handleMemberSearch() {
  fetchMembers(1)
}

// ==================== 踢出成员 ====================
async function handleKickMember(member: ConversationMember) {
  try {
    await ElMessageBox.confirm(
      `确认将「${member.nickname || member.userName}」移出本群？`,
      "踢出成员",
      { confirmButtonText: "确认踢出", cancelButtonText: "取消", type: "warning" }
    )
    const res = await removeConversationMemberApi(conversationId, member.id)
    if (res.code === 0) {
      ElMessage.success("已移出群组")
      fetchMembers(memberPage.value)
      if (conversation.value) conversation.value.memberCount--
    }
  } catch {
    // 取消操作
  }
}

// ==================== 禁言 ====================
const muteDialogVisible = ref(false)
const mutingMember = ref<ConversationMember | null>(null)
const muteDuration = ref<number>(0)
const muteDurationOptions = [
  { label: "1 小时", value: 3600 },
  { label: "24 小时", value: 86400 },
  { label: "7 天", value: 604800 },
  { label: "永久禁言", value: 0 }
]
const muteLoading = ref(false)

function openMuteDialog(member: ConversationMember) {
  mutingMember.value = member
  muteDuration.value = 0
  muteDialogVisible.value = true
}

async function confirmMute() {
  if (!mutingMember.value) return
  muteLoading.value = true
  try {
    const res = await muteMemberApi(conversationId, mutingMember.value.id, muteDuration.value)
    if (res.code === 0) {
      ElMessage.success("禁言成功")
      muteDialogVisible.value = false
      fetchMembers(memberPage.value)
    }
  } finally {
    muteLoading.value = false
  }
}

async function handleUnmute(member: ConversationMember) {
  const res = await unmuteMemberApi(conversationId, member.id)
  if (res.code === 0) {
    ElMessage.success("已解除禁言")
    fetchMembers(memberPage.value)
  }
}

// ==================== 账号封禁 ====================
async function handleBanUser(member: ConversationMember) {
  try {
    await ElMessageBox.confirm(
      `确认封禁「${member.nickname || member.userName}」的账号？\n· 将该用户踢出所有群组\n· 禁止该账号登录系统\n· 需要管理员手动解除封禁`,
      "账号封禁确认",
      {
        confirmButtonText: "确认封禁",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    )
    const res = await banUserApi(member.userId)
    if (res.code === 0) {
      ElMessage.success("封禁成功")
      fetchMembers(memberPage.value)
    }
  } catch {
    // 取消操作
  }
}

// ==================== 工具函数 ====================
function getMuteLabel(member: ConversationMember) {
  if (!member.muted) return ""
  if (!member.muteEndTime) return "永久禁言"
  return `禁言中 到期：${formatDateTime(member.muteEndTime * 1000, "MM-DD HH:mm")}`
}

function getRoleLabel(role: number) {
  if (role === 2) return "群主"
  if (role === 1) return "管理员"
  return "成员"
}

function getRoleTagType(role: number): "warning" | "primary" | "info" {
  if (role === 2) return "warning"
  if (role === 1) return "primary"
  return "info"
}

onMounted(async () => {
  await fetchConversation()
  fetchMessages()
  fetchMembers()
})
</script>

<template>
  <div class="chat-detail-page">
    <!-- 顶部信息栏 -->
    <div class="detail-header">
      <div class="header-left">
        <el-button text @click="router.push('/chat/list')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <template v-if="conversation">
          <span class="group-name">{{ conversation.name }}</span>
          <span class="group-meta">ID: {{ conversation.id }}</span>
          <span class="group-meta">{{ conversation.memberCount }} 人</span>
          <el-tag v-if="conversation.muteAll === 1" type="warning" size="small">
            全员禁言中
          </el-tag>
          <el-tag v-if="conversation.status === 3" type="danger" size="small">
            已解散
          </el-tag>
        </template>
      </div>
      <div v-if="conversation && conversation.status !== 3" class="header-actions">
        <el-button
          :type="conversation?.muteAll === 1 ? 'default' : 'warning'"
          size="small"
          :loading="muteAllLoading"
          plain
          @click="toggleMuteAll"
        >
          {{ conversation?.muteAll === 1 ? "解除全员禁言" : "全员禁言" }}
        </el-button>
        <el-button size="small" type="danger" plain :loading="dissolveLoading" @click="handleDissolve">
          解散群组
        </el-button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="detail-body">
      <!-- 左侧：消息历史 -->
      <div class="messages-panel">
        <div class="panel-title">
          消息历史
        </div>
        <div class="load-more-area">
          <el-button
            v-if="hasMoreMessages"
            text
            size="small"
            :loading="loadingMoreMessages"
            @click="fetchMessages(true)"
          >
            <el-icon><Top /></el-icon>
            加载更多
          </el-button>
          <span v-else class="no-more-tip">已加载全部消息</span>
        </div>
        <div ref="messagesContainer" v-loading="loadingMessages" class="messages-list">
          <el-empty v-if="!loadingMessages && messages.length === 0" description="暂无消息" :image-size="60" />
          <div v-for="msg in messages" :key="msg.id" class="message-item">
            <div class="message-meta">
              <span class="message-time">{{ formatDateTime(msg.timestamp) }}</span>
              <span class="message-sender">{{ msg.fromNickname || "未知用户" }}</span>
            </div>
            <div class="message-body">
              <div class="message-content">
                {{ msg.content || "[媒体消息]" }}
              </div>
              <el-button
                class="delete-btn"
                text
                size="small"
                type="danger"
                @click="handleDeleteMessage(msg.id)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：成员列表 -->
      <div class="members-panel">
        <div class="panel-title">
          成员列表
          <span class="member-count">（{{ memberTotal }}）</span>
        </div>
        <div class="member-search">
          <el-input
            v-model="memberKeyword"
            placeholder="搜索成员"
            size="small"
            clearable
            @keyup.enter="handleMemberSearch"
            @clear="handleMemberSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div v-loading="loadingMembers" class="member-list">
          <el-empty v-if="!loadingMembers && members.length === 0" description="暂无成员" :image-size="50" />
          <div v-for="member in members" :key="member.id" class="member-item">
            <div class="member-info">
              <el-avatar :src="member.userAvatar" :size="32">
                {{ (member.nickname || member.userName).charAt(0) }}
              </el-avatar>
              <div class="member-detail">
                <div class="member-name-row">
                  <span class="member-name">{{ member.nickname || member.userName }}</span>
                  <el-tag :type="getRoleTagType(member.memberRole)" size="small">
                    {{ getRoleLabel(member.memberRole) }}
                  </el-tag>
                  <el-tag
                    v-if="member.userRoleName"
                    size="small"
                    :style="getUserTypeLabelCssStyle(member.userRoleName)"
                  >
                    {{ member.userRoleName }}
                  </el-tag>
                  <el-tag
                    v-if="member.isOrgLeader"
                    size="small"
                    :style="{ backgroundColor: '#e8f5e8', color: '#52c41a', borderColor: '#b7eb8f' }"
                  >
                    组长
                  </el-tag>
                  <el-tag
                    v-if="member.isClassMonitor"
                    size="small"
                    :style="{ backgroundColor: '#e6f7ff', color: '#1890ff', borderColor: '#91d5ff' }"
                  >
                    班长
                  </el-tag>
                  <el-tag v-if="member.muted" type="danger" size="small">
                    禁言中
                  </el-tag>
                </div>
                <div v-if="member.muted" class="mute-info">
                  {{ getMuteLabel(member) }}
                </div>
              </div>
            </div>
            <div class="member-actions">
              <el-button
                v-if="member.muted"
                size="small"
                type="primary"
                text
                @click="handleUnmute(member)"
              >
                解禁
              </el-button>
              <el-button
                v-else
                size="small"
                type="warning"
                text
                @click="openMuteDialog(member)"
              >
                禁言
              </el-button>
              <el-button
                v-if="member.memberRole !== 2"
                size="small"
                type="danger"
                text
                @click="handleKickMember(member)"
              >
                踢出
              </el-button>
              <el-button size="small" type="danger" text @click="handleBanUser(member)">
                封禁账号
              </el-button>
            </div>
          </div>
        </div>
        <div v-if="memberTotal > 20" class="member-pagination">
          <el-pagination
            v-model:current-page="memberPage"
            :page-size="20"
            :total="memberTotal"
            layout="prev, pager, next"
            small
            @current-change="(p: number) => fetchMembers(p)"
          />
        </div>
      </div>
    </div>

    <!-- 禁言时长弹窗 -->
    <el-dialog
      v-model="muteDialogVisible"
      :title="`对「${mutingMember?.nickname || mutingMember?.userName}」禁言`"
      width="360px"
    >
      <el-radio-group v-model="muteDuration" class="mute-options">
        <el-radio v-for="opt in muteDurationOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="muteDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="muteLoading" @click="confirmMute">
          确认禁言
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.chat-detail-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  padding: 16px 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--el-border-color);
  margin-bottom: 12px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.group-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.detail-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

// 左侧消息面板
.messages-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
}

.panel-title {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
  flex-shrink: 0;

  .member-count {
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }
}

.load-more-area {
  display: flex;
  justify-content: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.no-more-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  line-height: 28px;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.message-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.message-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.message-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.message-sender {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.message-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.message-content {
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.5;
  flex: 1;
  word-break: break-all;
}

.delete-btn {
  flex-shrink: 0;
  padding: 0;
  height: auto;
}

// 右侧成员面板
.members-panel {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
}

.member-search {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.member-list {
  flex: 1;
  overflow-y: auto;
}

.member-item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.member-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.member-detail {
  flex: 1;
  min-width: 0;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.member-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.mute-info {
  font-size: 11px;
  color: var(--el-color-danger);
  margin-top: 2px;
}

.member-actions {
  display: flex;
  gap: 0;
  justify-content: flex-end;
}

.member-pagination {
  padding: 8px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

// 禁言选项
.mute-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
