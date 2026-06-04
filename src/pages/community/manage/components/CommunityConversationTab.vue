<script lang="ts" setup>
import type { ConversationMember, ConversationMemberCandidate, ConversationModel } from "@/api/im/conversation"
// 群组头像
import conversationsIcon from "@@/assets/images/conversations-icon.png"
// 状态图标
import qiyongzhongIcon from "@@/assets/images/qiyongzhong.png"
import yiguidangIcon from "@@/assets/images/yiguidang.png"
import { formatDateTime } from "@@/utils/datetime"
import { getUserTypeLabelCssStyle } from "@@/utils/userTypeLabel"
import { ElMessage, ElMessageBox } from "element-plus"

import { computed, onMounted, reactive, ref, watch } from "vue"
import { CommunityType } from "@/api/im/community"
import {
  addConversationMembersApi,
  ConversationType,
  createConversationApi,
  deleteConversationApi,
  getConversationMembersApi,
  getConversationsApi,
  removeConversationMemberApi,
  updateConversationApi
} from "@/api/im/conversation"

interface Props {
  communityId: number
  communityName?: string
  communityType?: CommunityType
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: "updateCount", count: number): void
  (e: "refreshCommunities"): void
}>()

const loading = ref(false)
const conversations = ref<ConversationModel[]>([])
const total = ref(0)

// 是否可以创建群组（仅牧养社区和事工社区）
const canManageGroup = computed(() =>
  props.communityType === CommunityType.Employee || props.communityType === CommunityType.Cooperation
)

// 是否可以编辑/归档群组（三种社区均支持）
const canEditGroup = computed(() =>
  props.communityType === CommunityType.Employee
  || props.communityType === CommunityType.Cooperation
  || props.communityType === CommunityType.Training
)

// 成长社区(Training)和事工社区(Cooperation)不展示「是否小组」字段
const showIsGroupField = computed(() =>
  props.communityType !== CommunityType.Training && props.communityType !== CommunityType.Cooperation
)

// 筛选状态：active | archived
const filterStatus = ref("active")

// 获取群组列表
async function fetchConversations() {
  if (!props.communityId) return
  loading.value = true
  try {
    // 根据筛选状态设置 status 参数：进行中=1，已归档=0
    const status = filterStatus.value === "active" ? 1 : 0
    const res = await getConversationsApi({
      communityId: props.communityId,
      status,
      page: 1,
      pageSize: 100
    })
    if (res.code === 0 && res.data) {
      conversations.value = res.data.list
      total.value = res.data.total
      // 只有进行中状态才更新父组件数量
      if (filterStatus.value === "active") {
        emit("updateCount", total.value)
      }
    }
  } catch (err) {
    console.error("获取群组列表失败", err)
  } finally {
    loading.value = false
  }
}

// 切换筛选状态
function handleFilterChange(status: "active" | "archived") {
  if (filterStatus.value === status) return
  filterStatus.value = status
  fetchConversations()
}

// ========== 创建/编辑群组对话框 ==========
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const dialogMode = ref<"create" | "edit">("create")
const editingConversationId = ref<number | null>(null)
const dialogForm = reactive({
  name: "",
  description: "",
  isGroup: false
})

// 选择群成员相关
const candidatesLoading = ref(false)
const searchKeyword = ref("")
const candidates = ref<ConversationMemberCandidate[]>([])
const selectedMembers = ref<ConversationMemberCandidate[]>([])
// 原有群成员（编辑时用于对比，包含 memberId）
const originalMembers = ref<{ memberId: number, userId: number }[]>([])

// 打开创建对话框
function openCreateDialog() {
  dialogMode.value = "create"
  editingConversationId.value = null
  dialogForm.name = ""
  dialogForm.description = ""
  dialogForm.isGroup = false
  searchKeyword.value = ""
  selectedMembers.value = []
  originalMembers.value = []
  dialogVisible.value = true
  fetchCandidates()
}

// 打开编辑对话框
async function openEditDialog(conversation: ConversationModel) {
  dialogMode.value = "edit"
  editingConversationId.value = conversation.id
  dialogForm.name = conversation.name
  dialogForm.description = conversation.announcement || ""
  dialogForm.isGroup = conversation.isGroup ?? false
  searchKeyword.value = ""
  originalMembers.value = []
  selectedMembers.value = []
  dialogVisible.value = true

  // 获取社区成员列表
  await fetchCandidates()

  // 获取当前群成员并预选
  await fetchExistingMembers(conversation.id)
}

// 获取社区成员列表
async function fetchCandidates() {
  candidatesLoading.value = true
  try {
    // 使用社区成员接口
    const { getCommunityMembersApi } = await import("@/api/im/community")
    const res = await getCommunityMembersApi(props.communityId, {
      keyword: searchKeyword.value,
      page: 1,
      pageSize: 100
    })
    if (res.code === 0 && res.data) {
      candidates.value = res.data.list.map(m => ({
        userId: m.userId,
        nickname: m.nickname || m.userName,
        avatar: m.userAvatar,
        email: "",
        userRole: m.userRole,
        roleName: m.userRoleName,
        isOrgLeader: m.isOrgLeader
      }))
    }
  } catch (err) {
    console.error("获取社区成员列表失败", err)
  } finally {
    candidatesLoading.value = false
  }
}

// 获取已有群成员（编辑时）
async function fetchExistingMembers(conversationId: number) {
  try {
    const res = await getConversationMembersApi(conversationId, {
      page: 1,
      pageSize: 100
    })
    if (res.code === 0 && res.data) {
      // 存储原有成员（包含 memberId，用于删除）
      originalMembers.value = res.data.list.map(m => ({
        memberId: m.id,
        userId: m.userId
      }))
      // 将已有成员添加到已选列表
      const existingUserIds = res.data.list.map(m => m.userId)
      candidates.value.forEach((candidate) => {
        if (existingUserIds.includes(candidate.userId) && !selectedMembers.value.some(s => s.userId === candidate.userId)) {
          selectedMembers.value.push(candidate)
        }
      })
    }
  } catch (err) {
    console.error("获取群成员失败", err)
  }
}

// 搜索成员
function handleSearch() {
  fetchCandidates()
}

// 检查是否已选中
function isSelected(userId: number): boolean {
  return selectedMembers.value.some(u => u.userId === userId)
}

// 切换选中状态
function toggleSelect(candidate: ConversationMemberCandidate) {
  const index = selectedMembers.value.findIndex(u => u.userId === candidate.userId)
  if (index > -1) {
    selectedMembers.value.splice(index, 1)
  } else {
    selectedMembers.value.push(candidate)
  }
}

// 移除已选人员
function removeSelected(userId: number) {
  const index = selectedMembers.value.findIndex(u => u.userId === userId)
  if (index > -1) {
    selectedMembers.value.splice(index, 1)
  }
}

// 全部移除
function clearSelected() {
  selectedMembers.value = []
}

// 默认头像
function getAvatarUrl(avatar: string): string {
  return avatar || "https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
}

// 保存群组
async function handleSave() {
  if (!dialogForm.name.trim()) {
    ElMessage.warning("请输入群组名称")
    return
  }

  dialogLoading.value = true
  try {
    if (dialogMode.value === "create") {
      // 创建群组
      const res = await createConversationApi({
        communityId: props.communityId,
        name: dialogForm.name.trim(),
        isGroup: dialogForm.isGroup,
        memberUserIds: selectedMembers.value.map(m => m.userId)
      })
      if (res.code === 0) {
        ElMessage.success("创建成功")
        dialogVisible.value = false
        fetchConversations()
        emit("refreshCommunities")
      }
    } else {
      // 编辑群组
      if (!editingConversationId.value) return

      const selectedUserIds = selectedMembers.value.map(m => m.userId)
      const originalUserIds = originalMembers.value.map(m => m.userId)

      // 找出需要移除的成员（原有成员中不在 selectedMembers 里的）
      const membersToRemove = originalMembers.value.filter(m => !selectedUserIds.includes(m.userId))

      // 找出需要添加的成员（selectedMembers 中不在原有成员里的）
      const membersToAdd = selectedMembers.value.filter(m => !originalUserIds.includes(m.userId))

      // 移除成员
      for (const member of membersToRemove) {
        await removeConversationMemberApi(editingConversationId.value, member.memberId)
      }

      // 添加新成员
      if (membersToAdd.length > 0) {
        await addConversationMembersApi(editingConversationId.value, membersToAdd.map(m => m.userId))
      }

      // 更新群组信息
      const res = await updateConversationApi(editingConversationId.value, {
        name: dialogForm.name.trim(),
        announcement: dialogForm.description.trim() || undefined
      })
      if (res.code === 0) {
        ElMessage.success("保存成功")
        dialogVisible.value = false
        fetchConversations()
      }
    }
  } catch (err) {
    console.error("保存群组失败", err)
  } finally {
    dialogLoading.value = false
  }
}

// 归档群组（调用删除接口）
async function handleArchive(conversation: ConversationModel) {
  try {
    await ElMessageBox.confirm(
      `确定要归档群组"${conversation.name}"吗？`,
      "归档确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
    const res = await deleteConversationApi(conversation.id)
    if (res.code === 0) {
      ElMessage.success("归档成功")
      fetchConversations()
      emit("refreshCommunities")
    }
  } catch (err) {
    if (err !== "cancel") {
      console.error("归档群组失败", err)
    }
  }
}

// ========== 查看群成员 ==========
const memberDialogVisible = ref(false)
const memberDialogLoading = ref(false)
const memberDialogList = ref<ConversationMember[]>([])
const memberDialogTitle = ref("")

async function openMemberDialog(conversation: ConversationModel) {
  memberDialogTitle.value = `${conversation.name} · 成员列表`
  memberDialogList.value = []
  memberDialogVisible.value = true
  memberDialogLoading.value = true
  try {
    const res = await getConversationMembersApi(conversation.id, { page: 1, pageSize: 200 })
    if (res.code === 0 && res.data) {
      memberDialogList.value = res.data.list
    }
  } catch (err) {
    console.error("获取群成员失败", err)
    ElMessage.error("获取群成员失败")
  } finally {
    memberDialogLoading.value = false
  }
}

onMounted(() => {
  fetchConversations()
})

watch(() => props.communityId, () => {
  fetchConversations()
})
</script>

<template>
  <div v-loading="loading" class="conversation-tab">
    <!-- 头部区域 -->
    <div class="tab-header">
      <!-- 筛选标签 -->
      <div class="filter-tabs">
        <div
          class="filter-tab"
          :class="{ active: filterStatus === 'active' }"
          @click="handleFilterChange('active')"
        >
          进行中
        </div>
        <div
          class="filter-tab"
          :class="{ active: filterStatus === 'archived' }"
          @click="handleFilterChange('archived')"
        >
          已归档
        </div>
      </div>

      <!-- 创建群组按钮（员工社区和合作社区显示） -->
      <el-button v-if="canManageGroup" type="primary" @click="openCreateDialog">
        创建群组
      </el-button>
    </div>

    <!-- 提示信息（仅成长社区显示） -->
    <div v-if="!canManageGroup" class="tip-info">
      <el-icon><InfoFilled /></el-icon>
      <span>成长社区群组由系统根据班级创建，无法手动添加</span>
    </div>

    <!-- 群组列表 -->
    <div class="conversation-list">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item"
      >
        <!-- 群头像 -->
        <img :src="conversationsIcon" class="group-avatar">

        <!-- 群组信息 -->
        <div class="conversation-info">
          <div class="conversation-name">
            <span class="name">{{ conversation.name }}</span>
            <img
              :src="conversation.status === 1 ? qiyongzhongIcon : yiguidangIcon"
              class="status-icon"
            >
          </div>
          <div class="conversation-meta">
            <span class="meta-item meta-item--clickable" @click="openMemberDialog(conversation)">
              <el-icon><User /></el-icon>
              {{ conversation.memberCount }}人
            </span>
            <span class="meta-item">
              <el-icon><Calendar /></el-icon>
              {{ formatDateTime(conversation.createdAt * 1000).split(" ")[0] }}
            </span>
          </div>
        </div>

        <!-- 操作按钮（进行中状态、非公告群显示编辑/归档） -->
        <div v-if="canEditGroup && conversation.status === 1 && conversation.type !== ConversationType.AnnouncementGroup" class="conversation-actions">
          <el-button type="primary" link @click="openEditDialog(conversation)">
            编辑
          </el-button>
          <el-button type="primary" link @click="handleArchive(conversation)">
            归档
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-if="!loading && conversations.length === 0" description="暂无群组" />

    <!-- 查看群成员对话框 -->
    <el-dialog
      v-model="memberDialogVisible"
      :title="memberDialogTitle"
      width="480px"
      :close-on-click-modal="true"
    >
      <div v-loading="memberDialogLoading" class="member-dialog-body">
        <div v-if="!memberDialogLoading && memberDialogList.length === 0" class="member-dialog-empty">
          <el-empty description="暂无成员" :image-size="80" />
        </div>
        <div
          v-for="member in memberDialogList"
          :key="member.id"
          class="member-dialog-item"
        >
          <el-avatar :size="36" :src="getAvatarUrl(member.userAvatar)" />
          <span class="member-dialog-name">{{ member.nickname || member.userName }}</span>
          <!-- 群内角色：群主/管理员 -->
          <el-tag
            v-if="member.memberRole === 1 || member.memberRole === 2"
            size="small"
            :type="member.memberRole === 1 ? 'warning' : 'info'"
            class="member-dialog-role"
          >
            {{ member.memberRoleName }}
          </el-tag>
          <!-- 组长 -->
          <el-tag
            v-if="member.isOrgLeader"
            size="small"
            class="member-dialog-role"
            :style="{ backgroundColor: '#e8f5e8', color: '#52c41a', borderColor: '#b7eb8f' }"
          >
            组长
          </el-tag>
          <!-- 班长 -->
          <el-tag
            v-if="member.isClassMonitor"
            size="small"
            class="member-dialog-role"
            :style="{ backgroundColor: '#fff7e6', color: '#fa8c16', borderColor: '#ffd591' }"
          >
            班长
          </el-tag>
          <!-- 系统角色 -->
          <el-tag
            v-if="member.userRoleName"
            size="small"
            class="member-dialog-role"
            :style="getUserTypeLabelCssStyle(member.userRoleName)"
          >
            {{ member.userRoleName }}
          </el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="memberDialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

    <!-- 创建/编辑群组对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建群组' : '编辑群组'"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px" class="group-form">
        <el-form-item label="所属亚社区：">
          <span class="readonly-text">{{ communityName || '当前亚社区' }}</span>
        </el-form-item>
        <el-form-item label="群组名称：" required>
          <el-input v-model="dialogForm.name" placeholder="请输入" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item v-if="showIsGroupField" label="是否小组：">
          <el-radio-group v-model="dialogForm.isGroup">
            <el-radio :value="true">
              是
            </el-radio>
            <el-radio :value="false">
              否
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述：">
          <el-input
            v-model="dialogForm.description"
            type="textarea"
            placeholder="请输入"
            :rows="3"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="群成员：" required>
          <div class="member-selector">
            <!-- 左侧候选人列表 -->
            <div class="candidates-panel">
              <div class="search-box">
                <el-input
                  v-model="searchKeyword"
                  placeholder="请输入人员信息"
                  clearable
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                >
                  <template #suffix>
                    <el-icon class="search-icon" @click="handleSearch">
                      <Search />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <div v-loading="candidatesLoading" class="candidates-list">
                <div
                  v-for="candidate in candidates"
                  :key="candidate.userId"
                  class="candidate-item"
                  @click="toggleSelect(candidate)"
                >
                  <el-checkbox
                    :model-value="isSelected(candidate.userId)"
                    @click.stop
                    @change="toggleSelect(candidate)"
                  />
                  <el-avatar :size="32" :src="getAvatarUrl(candidate.avatar)" />
                  <span class="candidate-name">{{ candidate.nickname }}</span>
                  <el-tag
                    v-if="candidate.isOrgLeader"
                    size="small"
                    class="candidate-role"
                    :style="{ backgroundColor: '#e8f5e8', color: '#52c41a', borderColor: '#b7eb8f' }"
                  >
                    组长
                  </el-tag>
                  <el-tag
                    v-if="candidate.roleName"
                    :style="getUserTypeLabelCssStyle(candidate.roleName)"
                    size="small"
                    class="candidate-role"
                  >
                    {{ candidate.roleName }}
                  </el-tag>
                </div>
                <el-empty v-if="!candidatesLoading && candidates.length === 0" description="暂无候选人" :image-size="60" />
              </div>
            </div>

            <!-- 右侧已选列表 -->
            <div class="selected-panel">
              <div class="selected-header">
                <span>已选 {{ selectedMembers.length }} 人</span>
                <el-button v-if="selectedMembers.length > 0" type="primary" link @click="clearSelected">
                  全部移除
                </el-button>
              </div>
              <div class="selected-list">
                <div
                  v-for="member in selectedMembers"
                  :key="member.userId"
                  class="selected-item"
                >
                  <el-avatar :size="32" :src="getAvatarUrl(member.avatar)" />
                  <span class="selected-name">{{ member.nickname }}</span>
                  <el-tag
                    v-if="member.isOrgLeader"
                    size="small"
                    class="selected-role"
                    :style="{ backgroundColor: '#e8f5e8', color: '#52c41a', borderColor: '#b7eb8f' }"
                  >
                    组长
                  </el-tag>
                  <el-tag
                    v-if="member.roleName"
                    :style="getUserTypeLabelCssStyle(member.roleName)"
                    size="small"
                    class="selected-role"
                  >
                    {{ member.roleName }}
                  </el-tag>
                  <el-icon class="remove-icon" @click="removeSelected(member.userId)">
                    <Close />
                  </el-icon>
                </div>
                <el-empty v-if="selectedMembers.length === 0" description="No Data" :image-size="60" />
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="dialogLoading" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.conversation-tab {
  padding: 16px 24px;
  height: 100%;
  overflow-y: auto;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.filter-tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.filter-tab {
  padding: 8px 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;

  &:hover {
    color: var(--el-color-primary);
  }

  &.active {
    color: var(--el-color-primary);
    border-bottom-color: var(--el-color-primary);
  }
}

.tip-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-color-primary);

  .el-icon {
    font-size: 16px;
  }
}

.conversation-list {
  display: flex;
  flex-direction: column;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

// 群头像
.group-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 8px;
  object-fit: cover;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  .name {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .status-icon {
    height: 18px;
  }
}

.conversation-meta {
  display: flex;
  align-items: center;
  gap: 16px;

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--el-text-color-secondary);

    .el-icon {
      font-size: 14px;
    }

    &--clickable {
      cursor: pointer;
      border-radius: 4px;
      padding: 2px 6px;
      margin-left: -6px;
      transition:
        background-color 0.15s,
        color 0.15s;

      &:hover {
        background-color: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }
    }
  }
}

// 查看群成员弹窗
.member-dialog-body {
  max-height: 400px;
  overflow-y: auto;
  min-height: 80px;
}

.member-dialog-empty {
  padding: 20px 0;
}

.member-dialog-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.member-dialog-name {
  flex: 1;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.member-dialog-role {
  flex-shrink: 0;
}

.conversation-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

// 群组表单
.group-form {
  .readonly-text {
    color: var(--el-text-color-regular);
  }
}

// 成员选择器
.member-selector {
  display: flex;
  gap: 16px;
  width: 100%;
}

.candidates-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  height: 300px;

  .search-box {
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .search-icon {
      cursor: pointer;
      color: var(--el-text-color-secondary);

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }

  .candidates-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .candidate-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &.is-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .candidate-name {
      font-size: 14px;
      color: var(--el-text-color-primary);
    }

    .candidate-role {
      flex-shrink: 0;
    }
  }
}

.selected-panel {
  width: 420px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  height: 300px;

  .selected-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-size: 14px;
    color: var(--el-text-color-primary);
  }

  .selected-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .selected-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;

    .selected-name {
      font-size: 13px;
      color: var(--el-text-color-primary);
    }

    .selected-role {
      flex-shrink: 0;
    }

    .remove-icon {
      cursor: pointer;
      color: var(--el-text-color-secondary);
      flex-shrink: 0;
      margin-left: auto;

      &:hover {
        color: var(--el-color-danger);
      }
    }
  }
}
</style>
