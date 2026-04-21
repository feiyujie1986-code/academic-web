<script lang="ts" setup>
import type { CandidateGroup, CandidateGroupMember, CommunityMember } from "@/api/im/community"
import { formatDateTime } from "@@/utils/datetime"
import { getUserTypeLabelCssStyle } from "@@/utils/userTypeLabel"
import { ElMessage } from "element-plus"
import { computed, onMounted, reactive, ref, watch } from "vue"
import {
  addCommunityMembersApi,
  CommunityType,
  getCandidateGroupMembersApi,
  getCandidateGroupsApi,
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

// 合作社区和牧养社区可添加人员
const canAddMember = computed(() =>
  props.communityType === CommunityType.Cooperation || props.communityType === CommunityType.Employee
)

async function fetchMembers() {
  if (!props.communityId) return
  loading.value = true
  try {
    const res = await getCommunityMembersApi(props.communityId, { page: 1, pageSize: 100 })
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

function getAvatarUrl(avatar: string): string {
  return avatar || "https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
}

// ========== 牧养社区分组选人 ==========
const empDialogVisible = ref(false)
const empAddLoading = ref(false)
const groupsLoading = ref(false)
const allGroups = ref<CandidateGroup[]>([])
const groupSearchKeyword = ref("")

// 分组展开状态、成员缓存、加载状态
const expandedKeys = reactive<Record<string, boolean>>({})
const membersCache = reactive<Record<string, CandidateGroupMember[]>>({})
const membersLoadingKeys = reactive<Record<string, boolean>>({})
// 已选人员：id(string) → 成员数据
const selectedMemberMap = reactive<Record<string, CandidateGroupMember>>({})
// 打开弹窗时已在社区的成员 userId 集合，用于计算新增/移除
const originalMemberIds = ref<Set<number>>(new Set())

const selectedMembersList = computed(() => Object.values(selectedMemberMap))
const selectedCount = computed(() => selectedMembersList.value.length)

const orgGroups = computed(() => allGroups.value.filter(g => g.groupType === "org"))
const nonOrgGroups = computed(() => allGroups.value.filter(g => g.groupType !== "org"))

// 分组区域列表（小组 + 角色两大块）
const groupedSections = computed(() => {
  const sections: { label: string, groups: CandidateGroup[] }[] = []
  if (orgGroups.value.length > 0) sections.push({ label: "小组", groups: orgGroups.value })
  if (nonOrgGroups.value.length > 0) sections.push({ label: "角色", groups: nonOrgGroups.value })
  return sections
})

function getGroupKey(group: CandidateGroup): string {
  return `${group.groupType}_${group.groupId}`
}

function buildSearchParams(): { nickname?: string, email?: string } {
  const kw = groupSearchKeyword.value.trim()
  if (!kw) return {}
  return kw.includes("@") ? { email: kw } : { nickname: kw }
}

function resetEmpState() {
  Object.keys(expandedKeys).forEach((k) => {
    delete expandedKeys[k]
  })
  Object.keys(membersCache).forEach((k) => {
    delete membersCache[k]
  })
  Object.keys(membersLoadingKeys).forEach((k) => {
    delete membersLoadingKeys[k]
  })
  Object.keys(selectedMemberMap).forEach((k) => {
    delete selectedMemberMap[k]
  })
  groupSearchKeyword.value = ""
  allGroups.value = []
  originalMemberIds.value = new Set()
}

async function openEmpDialog() {
  resetEmpState()
  empDialogVisible.value = true
  // 预填充已在社区的成员到右侧已选面板
  originalMemberIds.value = new Set(members.value.map(m => m.userId))
  members.value.forEach((m) => {
    selectedMemberMap[String(m.userId)] = {
      id: m.userId,
      nickname: m.userName || m.nickname,
      email: "",
      avatar: m.userAvatar,
      gender: 0,
      active: true,
      userType: m.userType,
      userTypeLabels: [m.userTypeName].filter(Boolean),
      isOrgLeader: false,
      exists: true
    }
  })
  await fetchCandidateGroups()
}

async function fetchCandidateGroups() {
  groupsLoading.value = true
  // 搜索时折叠所有分组并清空缓存
  Object.keys(expandedKeys).forEach((k) => {
    delete expandedKeys[k]
  })
  Object.keys(membersCache).forEach((k) => {
    delete membersCache[k]
  })
  try {
    const res = await getCandidateGroupsApi(props.communityId, {
      type: props.communityType,
      ...buildSearchParams()
    })
    if (res.code === 0 && res.data) {
      allGroups.value = res.data.groups
    }
  } catch (err) {
    console.error("获取候选分组失败", err)
    ElMessage.error("获取分组失败")
  } finally {
    groupsLoading.value = false
  }
}

function handleGroupSearch() {
  fetchCandidateGroups()
}

async function loadGroupMembers(group: CandidateGroup) {
  const key = getGroupKey(group)
  if (membersCache[key]) return
  membersLoadingKeys[key] = true
  try {
    const res = await getCandidateGroupMembersApi(
      props.communityId,
      group.groupType,
      group.groupId,
      { type: props.communityType, ...buildSearchParams(), page: 1, pageSize: 999 }
    )
    if (res.code === 0 && res.data) {
      membersCache[key] = res.data.members
    }
  } catch (err) {
    console.error("获取分组成员失败", err)
  } finally {
    delete membersLoadingKeys[key]
  }
}

async function toggleGroupExpand(group: CandidateGroup) {
  const key = getGroupKey(group)
  if (expandedKeys[key]) {
    expandedKeys[key] = false
  } else {
    expandedKeys[key] = true
    await loadGroupMembers(group)
  }
}

function isGroupFullySelected(group: CandidateGroup): boolean {
  const key = getGroupKey(group)
  const list = membersCache[key]
  if (!list || list.length === 0) return false
  const selectable = list.filter(m => !m.exists)
  if (selectable.length === 0) return false
  return selectable.every(m => selectedMemberMap[String(m.id)] !== undefined)
}

function isGroupIndeterminate(group: CandidateGroup): boolean {
  const key = getGroupKey(group)
  const list = membersCache[key]
  if (!list || list.length === 0) return false
  const selectable = list.filter(m => !m.exists)
  const num = selectable.filter(m => selectedMemberMap[String(m.id)] !== undefined).length
  return num > 0 && num < selectable.length
}

async function toggleGroupSelect(group: CandidateGroup) {
  const key = getGroupKey(group)
  if (!membersCache[key]) {
    await loadGroupMembers(group)
  }
  const list = membersCache[key] || []
  const selectable = list.filter(m => !m.exists)
  if (isGroupFullySelected(group)) {
    selectable.forEach((m) => {
      delete selectedMemberMap[String(m.id)]
    })
  } else {
    selectable.forEach((m) => {
      selectedMemberMap[String(m.id)] = m
    })
  }
}

function toggleMemberSelect(member: CandidateGroupMember) {
  if (member.exists) return
  const key = String(member.id)
  if (selectedMemberMap[key] !== undefined) {
    delete selectedMemberMap[key]
  } else {
    selectedMemberMap[key] = member
  }
}

function removeSelectedMember(id: number) {
  delete selectedMemberMap[String(id)]
}

function clearAllSelected() {
  Object.keys(selectedMemberMap).forEach((k) => {
    delete selectedMemberMap[k]
  })
}

async function handleEmpAddMembers() {
  empAddLoading.value = true
  try {
    const currentIds = new Set(Object.keys(selectedMemberMap).map(Number))
    const idsToAdd = [...currentIds].filter(id => !originalMemberIds.value.has(id))
    const membersToRemove = members.value.filter(m => !currentIds.has(m.userId))

    for (const member of membersToRemove) {
      await removeCommunityMemberApi(props.communityId, member.id)
    }
    if (idsToAdd.length > 0) {
      await addCommunityMembersApi(props.communityId, idsToAdd.map(id => ({ userId: id })))
    }
    ElMessage.success("保存成功")
    empDialogVisible.value = false
    fetchMembers()
  } catch (err) {
    console.error("保存失败", err)
    ElMessage.error("保存失败")
  } finally {
    empAddLoading.value = false
  }
}

// ========== 统一入口 ==========
async function openAddDialog() {
  await openEmpDialog()
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
    <!-- 头部操作栏 -->
    <div v-if="canAddMember" class="member-header">
      <p v-if="communityType === CommunityType.Employee || communityType === CommunityType.Cooperation" class="member-notice">
        默认会把超级管理员，牧长，长执加入亚社区，不会默认加入群组
      </p>
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
              v-if="member.isOrgLeader"
              size="small"
              class="role-tag"
              :style="{ backgroundColor: '#e8f5e8', color: '#52c41a', borderColor: '#b7eb8f' }"
            >
              组长
            </el-tag>
            <el-tag :style="getUserTypeLabelCssStyle(member.userRoleName)" size="small" class="role-tag">
              {{ member.userRoleName }}
            </el-tag>
          </div>
          <div class="member-time">
            加入时间：{{ formatDateTime(member.joinedAt * 1000).split(" ")[0] }}
          </div>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && members.length === 0" description="暂无成员" />

    <!-- ========== 分组选人弹窗（事工/牧养社区共用） ========== -->
    <el-dialog
      v-model="empDialogVisible"
      title="添加人员"
      width="800px"
      :close-on-click-modal="false"
      class="emp-dialog"
    >
      <!-- 搜索栏 -->
      <div class="emp-search-bar">
        <el-input
          v-model="groupSearchKeyword"
          placeholder="请输入姓名或邮箱"
          clearable
          style="width: 280px"
          @keyup.enter="handleGroupSearch"
        />
        <el-button type="primary" @click="handleGroupSearch">
          搜索
        </el-button>
      </div>

      <!-- 主内容区 -->
      <div class="emp-content">
        <!-- 左侧候选列表 -->
        <div class="emp-left-panel">
          <div class="emp-left-header">
            <span>可选人员</span>
            <span class="emp-total-text">共 {{ allGroups.reduce((s, g) => s + g.count, 0) }} 人</span>
          </div>

          <div v-loading="groupsLoading" class="emp-group-container">
            <template v-for="section in groupedSections" :key="section.label">
              <div class="emp-section-label">{{ section.label }}</div>

              <div v-for="group in section.groups" :key="getGroupKey(group)">
                <!-- 分组行 -->
                <div class="emp-group-row" @click="toggleGroupExpand(group)">
                  <el-checkbox
                    :model-value="isGroupFullySelected(group)"
                    :indeterminate="isGroupIndeterminate(group)"
                    @click.stop
                    @change="toggleGroupSelect(group)"
                  />
                  <span class="emp-group-name">{{ group.groupName }}</span>
                  <span class="emp-count-badge">{{ group.count }}</span>
                  <el-icon
                    class="emp-expand-icon"
                    :class="{ 'is-expanded': expandedKeys[getGroupKey(group)] }"
                  >
                    <ArrowRight />
                  </el-icon>
                </div>

                <!-- 展开的成员列表 -->
                <div v-if="expandedKeys[getGroupKey(group)]" class="emp-member-container">
                  <div v-if="membersLoadingKeys[getGroupKey(group)]" class="emp-member-loading">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span>加载中...</span>
                  </div>
                  <template v-else>
                    <div
                      v-for="member in (membersCache[getGroupKey(group)] || [])"
                      :key="member.id"
                      class="emp-member-row"
                      :class="{ 'is-exists': member.exists }"
                      @click="toggleMemberSelect(member)"
                    >
                      <el-checkbox
                        :model-value="selectedMemberMap[String(member.id)] !== undefined"
                        :disabled="member.exists"
                        @click.stop
                        @change="toggleMemberSelect(member)"
                      />
                      <div class="emp-member-info">
                        <div class="emp-member-top">
                          <span class="emp-member-name">{{ member.nickname }}</span>
                          <el-tag
                            v-if="member.isOrgLeader"
                            size="small"
                            class="emp-label-tag"
                            :style="{ backgroundColor: '#e8f5e8', color: '#52c41a', borderColor: '#b7eb8f' }"
                          >
                            组长
                          </el-tag>
                          <el-tag
                            v-for="label in member.userTypeLabels"
                            :key="label"
                            size="small"
                            class="emp-label-tag"
                            :style="getUserTypeLabelCssStyle(label)"
                          >
                            {{ label }}
                          </el-tag>
                          <el-tag v-if="member.exists" size="small" type="info" class="emp-label-tag">
                            已加入
                          </el-tag>
                        </div>
                        <div class="emp-member-email">{{ member.email }}</div>
                      </div>
                    </div>
                    <el-empty
                      v-if="!(membersCache[getGroupKey(group)] || []).length"
                      description="暂无成员"
                      :image-size="40"
                    />
                  </template>
                </div>
              </div>
            </template>

            <el-empty v-if="!groupsLoading && allGroups.length === 0" description="暂无数据" :image-size="60" />
          </div>
        </div>

        <!-- 右侧已选列表 -->
        <div class="emp-right-panel">
          <div class="emp-right-header">
            <span>已选 {{ selectedCount }} 人</span>
            <el-button v-if="selectedCount > 0" type="primary" link size="small" @click="clearAllSelected">
              全部移除
            </el-button>
          </div>
          <div class="emp-selected-list">
            <div
              v-for="member in selectedMembersList"
              :key="member.id"
              class="emp-selected-item"
            >
              <el-avatar :size="36" :src="getAvatarUrl(member.avatar)" class="emp-selected-avatar" />
              <span class="emp-selected-name">{{ member.nickname }}</span>
              <el-icon class="emp-remove-icon" @click="removeSelectedMember(member.id)">
                <Close />
              </el-icon>
            </div>
            <el-empty v-if="selectedCount === 0" description="暂无选择" :image-size="60" />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="empDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="empAddLoading" @click="handleEmpAddMembers">保存</el-button>
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
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.member-notice {
  margin: 0 auto 0 0;
  font-size: 13px;
  color: #f56c6c;
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

// ========== 事工社区弹窗 ==========
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

// ========== 牧养社区弹窗 ==========
.emp-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.emp-content {
  display: flex;
  gap: 0;
  height: 480px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
}

// 左侧
.emp-left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}

.emp-left-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.emp-total-text {
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.emp-group-container {
  flex: 1;
  overflow-y: auto;
}

.emp-section-label {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-light);
  font-weight: 500;
}

.emp-group-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.15s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.emp-group-name {
  flex: 1;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.emp-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background-color: #ff7875;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.emp-expand-icon {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  flex-shrink: 0;
  transition: transform 0.2s;

  &.is-expanded {
    transform: rotate(90deg);
  }
}

// 展开的成员列表
.emp-member-container {
  background-color: #fafafa;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.emp-member-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.emp-member-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px 10px 32px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover:not(.is-exists) {
    background-color: var(--el-fill-color);
  }

  &.is-exists {
    opacity: 0.6;
    cursor: default;
  }
}

.emp-member-info {
  flex: 1;
  min-width: 0;
}

.emp-member-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 3px;
}

.emp-member-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.emp-label-tag {
  flex-shrink: 0;
}

.emp-member-email {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

// 右侧已选
.emp-right-panel {
  width: 240px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.emp-right-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.emp-selected-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.emp-selected-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.emp-selected-avatar {
  flex-shrink: 0;
}

.emp-selected-name {
  flex: 1;
  font-size: 14px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.emp-remove-icon {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  margin-left: 8px;

  &:hover {
    color: var(--el-color-danger);
  }
}
</style>
