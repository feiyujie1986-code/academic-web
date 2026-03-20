<script lang="ts" setup>
import type { CommunityMember, MemberCandidate } from "@/api/im/community"
import { formatDateTime } from "@@/utils/datetime"
import { ElMessage } from "element-plus"
import { computed, onMounted, ref, watch } from "vue"
import {
  addCommunityMembersApi,
  CommunityType,
  getCommunityMemberCandidatesApi,
  getCommunityMembersApi,
  removeCommunityMemberApi
} from "@/api/im/community"

interface Props {
  communityId: number
  communityType: CommunityType
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: "updateCount", count: number): void
}>()

const loading = ref(false)
const members = ref<CommunityMember[]>([])
const total = ref(0)

// 是否可以添加人员（合作社区和员工社区）
const canAddMember = computed(() =>
  props.communityType === CommunityType.Cooperation || props.communityType === CommunityType.Employee
)

// 角色标签样式映射（浅色背景 + 彩色文字）
function getRoleTagStyle(roleName: string): Record<string, string> {
  const styleMap: Record<string, { bg: string, color: string }> = {
    超级管理员: { bg: "#EBFAEF", color: "#52C41A" },
    大使长: { bg: "#F5E8FF", color: "#9216FF" },
    大使: { bg: "#FFEFF0", color: "#E6A23C" },
    教师: { bg: "#E8F1FF", color: "#409EFF" },
    学员: { bg: "#FFF4EA", color: "#FF8D28" },
    机构人员: { bg: "#E6F9FB", color: "#00C3D0" },
    财务: { bg: "#F0EEFE", color: "#6155F5" },
    运营: { bg: "#F7F3EF", color: "#AC7F5E" }
  }
  const style = styleMap[roleName] || { bg: "#F0F0F0", color: "#666666" }
  return {
    backgroundColor: style.bg,
    color: style.color,
    borderColor: style.bg
  }
}

// 获取成员数据
async function fetchMembers() {
  if (!props.communityId) return
  loading.value = true
  try {
    const res = await getCommunityMembersApi(props.communityId, {
      page: 1,
      pageSize: 100
    })
    if (res.code === 0 && res.data) {
      members.value = res.data.list
      total.value = res.data.total
      emit("updateCount", total.value)
    }
  } catch (err) {
    console.error("获取社区成员失败", err)
  } finally {
    loading.value = false
  }
}

// 默认头像
function getAvatarUrl(avatar: string): string {
  return avatar || "https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
}

// ========== 添加人员对话框 ==========
const addDialogVisible = ref(false)
const addLoading = ref(false)
const candidatesLoading = ref(false)
const searchKeyword = ref("")
const candidates = ref<MemberCandidate[]>([])
const selectedUsers = ref<MemberCandidate[]>([])

// 判断是否为受保护角色（大使长和超级管理员不可取消）
function isProtectedRole(userRole: string): boolean {
  return userRole === "super_admin" || userRole === "admin"
}

// 打开添加人员对话框
async function openAddDialog() {
  searchKeyword.value = ""
  selectedUsers.value = []
  addDialogVisible.value = true
  await fetchCandidates()
}

// 获取候选人列表
async function fetchCandidates() {
  candidatesLoading.value = true
  try {
    const res = await getCommunityMemberCandidatesApi(props.communityId, {
      keyword: searchKeyword.value,
      page: 1,
      pageSize: 100
    })
    if (res.code === 0 && res.data) {
      candidates.value = res.data.list
      // 获取已有成员的 userId 列表
      const existingMemberIds = members.value.map(m => m.userId)
      // 自动选中已有成员（在候选人列表中的）
      res.data.list.forEach((candidate) => {
        if (existingMemberIds.includes(candidate.userId) && !selectedUsers.value.some(u => u.userId === candidate.userId)) {
          selectedUsers.value.push(candidate)
        }
      })
    }
  } catch (err) {
    console.error("获取候选人列表失败", err)
  } finally {
    candidatesLoading.value = false
  }
}

// 搜索候选人
function handleSearch() {
  fetchCandidates()
}

// 检查是否已选中
function isSelected(userId: number): boolean {
  return selectedUsers.value.some(u => u.userId === userId)
}

// 切换选中状态
function toggleSelect(candidate: MemberCandidate) {
  // 受保护角色不允许取消选中
  if (isProtectedRole(candidate.userRole)) return

  const index = selectedUsers.value.findIndex(u => u.userId === candidate.userId)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(candidate)
  }
}

// 移除已选人员
function removeSelected(user: MemberCandidate) {
  // 受保护角色不允许移除
  if (isProtectedRole(user.userRole)) return

  const index = selectedUsers.value.findIndex(u => u.userId === user.userId)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  }
}

// 全部移除（保留受保护角色）
function clearSelected() {
  selectedUsers.value = selectedUsers.value.filter(u => isProtectedRole(u.userRole))
}

// 保存添加人员
async function handleAddMembers() {
  addLoading.value = true
  try {
    const selectedUserIds = selectedUsers.value.map(u => u.userId)
    const existingUserIds = members.value.map(m => m.userId)

    // 找出需要移除的成员（原有成员中不在 selectedUsers 里的）
    const membersToRemove = members.value.filter(m => !selectedUserIds.includes(m.userId))
    // 找出需要添加的成员（selectedUsers 中不在原有成员里的）
    const membersToAdd = selectedUsers.value.filter(u => !existingUserIds.includes(u.userId))

    // 移除成员
    for (const member of membersToRemove) {
      await removeCommunityMemberApi(props.communityId, member.id)
    }

    // 添加新成员
    if (membersToAdd.length > 0) {
      const addParams = membersToAdd.map(u => ({ userId: u.userId }))
      await addCommunityMembersApi(props.communityId, addParams)
    }

    ElMessage.success("保存成功")
    addDialogVisible.value = false
    fetchMembers()
  } catch (err) {
    console.error("保存失败", err)
  } finally {
    addLoading.value = false
  }
}

onMounted(() => {
  fetchMembers()
})

watch(() => props.communityId, () => {
  fetchMembers()
})
</script>

<template>
  <div v-loading="loading" class="member-tab">
    <!-- 头部操作栏（合作社区和员工社区显示） -->
    <div v-if="canAddMember" class="member-header">
      <el-button type="primary" plain @click="openAddDialog">
        添加人员
      </el-button>
    </div>

    <!-- 成员列表 -->
    <div class="member-list">
      <div
        v-for="member in members"
        :key="member.id"
        class="member-item"
      >
        <el-avatar :size="40" :src="getAvatarUrl(member.userAvatar)" />
        <div class="member-info">
          <div class="member-name">
            <span class="name">{{ member.userName || member.nickname }}</span>
            <el-tag
              :style="getRoleTagStyle(member.userRoleName)"
              size="small"
              class="role-tag"
            >
              {{ member.userRoleName }}
            </el-tag>
          </div>
          <div class="member-time">
            加入时间：{{ formatDateTime(member.joinedAt * 1000).split(" ")[0] }}
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-if="!loading && members.length === 0" description="暂无成员" />

    <!-- 添加人员对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加人员"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="add-member-content">
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
              :class="{ 'is-disabled': isProtectedRole(candidate.userRole) }"
              @click="toggleSelect(candidate)"
            >
              <el-checkbox
                :model-value="isSelected(candidate.userId)"
                :disabled="isProtectedRole(candidate.userRole)"
                @click.stop
                @change="toggleSelect(candidate)"
              />
              <el-avatar :size="40" :src="getAvatarUrl(candidate.avatar)" />
              <div class="candidate-info">
                <div class="candidate-name">
                  <span class="name">{{ candidate.nickname }}</span>
                  <el-tag
                    :style="getRoleTagStyle(candidate.userRoleName)"
                    size="small"
                    class="candidate-role"
                  >
                    {{ candidate.userRoleName }}
                  </el-tag>
                </div>
                <div class="candidate-email">
                  {{ candidate.email }}
                </div>
              </div>
            </div>
            <el-empty v-if="!candidatesLoading && candidates.length === 0" description="暂无候选人" />
          </div>
        </div>

        <!-- 右侧已选列表 -->
        <div class="selected-panel">
          <div class="selected-header">
            <span>已选 {{ selectedUsers.length }} 人</span>
            <el-button v-if="selectedUsers.length > 0" type="primary" link @click="clearSelected">
              全部移除
            </el-button>
          </div>
          <div class="selected-list">
            <div
              v-for="user in selectedUsers"
              :key="user.userId"
              class="selected-item"
            >
              <el-avatar :size="40" :src="getAvatarUrl(user.avatar)" />
              <span class="selected-name">{{ user.nickname }}</span>
              <el-icon v-if="!isProtectedRole(user.userRole)" class="remove-icon" @click="removeSelected(user)">
                <Close />
              </el-icon>
            </div>
            <el-empty v-if="selectedUsers.length === 0" description="No Data" :image-size="60" />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="addDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="addLoading" @click="handleAddMembers">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.member-tab {
  padding: 16px 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.member-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.member-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  .name {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .role-tag {
    flex-shrink: 0;
  }
}

.member-time {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

// 添加人员对话框样式
.add-member-content {
  display: flex;
  gap: 16px;
  height: 400px;
}

.candidates-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;

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
    gap: 12px;
    padding: 12px;
    cursor: pointer;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &.is-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .candidate-info {
      flex: 1;
      min-width: 0;
    }

    .candidate-name {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .name {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
      }

      .candidate-role {
        flex-shrink: 0;
      }
    }

    .candidate-email {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }
}

.selected-panel {
  width: 200px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;

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
    gap: 12px;
    padding: 8px 12px;

    .selected-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .remove-icon {
      cursor: pointer;
      color: var(--el-text-color-secondary);
      flex-shrink: 0;

      &:hover {
        color: var(--el-color-danger);
      }
    }
  }
}
</style>
