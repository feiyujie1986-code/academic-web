<script lang="ts" setup>
import type { ConversationModel, MatchedUser } from "@/api/im/conversation"
import { formatDateTime } from "@@/utils/datetime"
import { ElMessage, ElMessageBox } from "element-plus"
import { ref } from "vue"
import { useRouter } from "vue-router"
import { getConversationsApi } from "@/api/im/conversation"
import { banUserApi, unbanUserApi } from "@/api/im/user"

defineOptions({ name: "ChatList" })

const router = useRouter()

const searchMode = ref<"keyword" | "nickname">("keyword")
const keyword = ref("")
const loading = ref(false)
const searched = ref(false)
const groupList = ref<ConversationModel[]>([])
const matchedUsers = ref<MatchedUser[]>([])
const total = ref(0)

async function handleSearch() {
  if (!keyword.value.trim()) return
  loading.value = true
  searched.value = true
  try {
    const params = searchMode.value === "keyword"
      ? { keyword: keyword.value.trim(), page: 1, pageSize: 50 }
      : { memberNickname: keyword.value.trim(), page: 1, pageSize: 50 }
    const res = await getConversationsApi(params)
    if (res.code === 0) {
      groupList.value = res.data.list
      total.value = res.data.total
      matchedUsers.value = res.data.matchedUsers || []
    }
  } catch {
    // 错误由 axios 拦截器处理
  } finally {
    loading.value = false
  }
}

function handleModeChange() {
  keyword.value = ""
  groupList.value = []
  matchedUsers.value = []
  searched.value = false
  total.value = 0
}

function goToDetail(id: number) {
  router.push(`/chat/detail/${id}`)
}

async function handleBanUser(user: MatchedUser) {
  try {
    await ElMessageBox.confirm(
      `确认封禁「${user.nickname}」的账号？\n· 将该用户踢出所有群组\n· 禁止该账号登录系统\n· 需要管理员手动解除封禁`,
      "账号封禁确认",
      {
        confirmButtonText: "确认封禁",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    )
    const res = await banUserApi(user.userId)
    if (res.code === 0) {
      ElMessage.success("封禁成功")
      user.active = false
    }
  } catch {
    // 取消操作
  }
}

async function handleUnbanUser(user: MatchedUser) {
  try {
    const res = await unbanUserApi(user.userId)
    if (res.code === 0) {
      ElMessage.success("解封成功")
      user.active = true
    }
  } catch {
    // 错误由 axios 拦截器处理
  }
}

const typeMap: Record<number, string> = {
  1: "普通群",
  2: "公告群",
  3: "班级群",
  5: "小组群"
}
</script>

<template>
  <div class="chat-list-page">
    <div class="page-header">
      <h2 class="page-title">
        群组维护
      </h2>
    </div>

    <div class="search-bar">
      <el-radio-group v-model="searchMode" class="mode-toggle" @change="handleModeChange">
        <el-radio-button value="keyword">
          群名称 / ID
        </el-radio-button>
        <el-radio-button value="nickname">
          成员昵称
        </el-radio-button>
      </el-radio-group>
      <el-input
        v-model="keyword"
        class="search-input"
        :placeholder="searchMode === 'keyword' ? '输入群组 ID 或群名称' : '输入成员昵称'"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleModeChange"
      />
      <el-button type="primary" :loading="loading" @click="handleSearch">
        搜索
      </el-button>
    </div>

    <!-- 成员昵称模式：命中用户面板 -->
    <template v-if="searchMode === 'nickname' && searched">
      <div class="result-section">
        <div class="result-title">
          命中用户
          <span class="result-count">（{{ matchedUsers.length }}）</span>
        </div>
        <el-empty v-if="!loading && matchedUsers.length === 0" description="未找到匹配用户" :image-size="60" />
        <div v-else class="user-list">
          <div v-for="user in matchedUsers" :key="user.userId" class="user-item">
            <el-avatar :src="user.avatar" :size="36">
              {{ user.nickname.charAt(0) }}
            </el-avatar>
            <div class="user-info">
              <div class="user-name">
                {{ user.nickname }}
                <el-tag v-if="!user.active" type="danger" size="small">
                  已封禁
                </el-tag>
              </div>
              <div class="user-email">
                {{ user.email }}
              </div>
            </div>
            <div class="user-actions">
              <el-button
                v-if="user.active"
                size="small"
                type="danger"
                plain
                @click="handleBanUser(user)"
              >
                封禁账号
              </el-button>
              <el-button
                v-else
                size="small"
                type="primary"
                plain
                @click="handleUnbanUser(user)"
              >
                解除封禁
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="result-section">
        <div class="result-title">
          以上用户所在的群组
          <span class="result-count">（{{ total }}）</span>
        </div>
        <el-empty v-if="!loading && groupList.length === 0" description="未找到相关群组" :image-size="60" />
        <div v-else class="group-list">
          <div
            v-for="group in groupList"
            :key="group.id"
            class="group-item"
            @click="goToDetail(group.id)"
          >
            <div class="group-main">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-meta">ID: {{ group.id }}</span>
              <span class="group-meta">{{ group.memberCount }} 人</span>
              <el-tag size="small" type="info">
                {{ typeMap[group.type] || group.typeName }}
              </el-tag>
              <span class="group-meta">{{ formatDateTime(group.createdAt * 1000, "YYYY-MM-DD") }}</span>
            </div>
            <el-icon class="group-arrow">
              <ArrowRight />
            </el-icon>
          </div>
        </div>
      </div>
    </template>

    <!-- 群名称/ID 模式：直接显示群组列表 -->
    <template v-else-if="searchMode === 'keyword' && searched">
      <div class="result-section">
        <div class="result-title">
          搜索结果
          <span class="result-count">（{{ total }}）</span>
        </div>
        <el-empty v-if="!loading && groupList.length === 0" description="未找到相关群组" :image-size="60" />
        <div v-else class="group-list">
          <div
            v-for="group in groupList"
            :key="group.id"
            class="group-item"
            @click="goToDetail(group.id)"
          >
            <div class="group-main">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-meta">ID: {{ group.id }}</span>
              <span class="group-meta">{{ group.memberCount }} 人</span>
              <el-tag size="small" type="info">
                {{ typeMap[group.type] || group.typeName }}
              </el-tag>
              <span class="group-meta">{{ formatDateTime(group.createdAt * 1000, "YYYY-MM-DD") }}</span>
            </div>
            <el-icon class="group-arrow">
              <ArrowRight />
            </el-icon>
          </div>
        </div>
      </div>
    </template>

    <!-- 未搜索时的空状态 -->
    <div v-else class="empty-hint">
      <el-empty description="输入关键词后点击搜索" :image-size="80" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-list-page {
  padding: 24px;
  max-width: 900px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;

  .mode-toggle {
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    max-width: 400px;
  }
}

.result-section {
  margin-bottom: 28px;
}

.result-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;

  .result-count {
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }
}

.user-list {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-email {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.user-actions {
  flex-shrink: 0;
}

.group-list {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background-color 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.group-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.group-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.group-arrow {
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.empty-hint {
  margin-top: 60px;
}
</style>
