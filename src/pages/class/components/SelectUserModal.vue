<script lang="ts" setup>
import { reactive, ref, watch } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import type { GroupMember, MemberGroup } from "@/api/member/memberGroup"
import { getMemberGroupMembersApi, getMemberGroupsApi } from "@/api/member/memberGroup"

interface UserItem {
  id: number
  nickname: string
  email?: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  /** 是否使用分组懒加载 API（建班选人场景），false 则使用 userList 本地模式 */
  useGroupApi?: boolean
  /** 本地模式下的候选人员列表 */
  userList?: UserItem[]
  /** 已选用户 ID 列表 */
  selectedUserIds?: number[]
  /** 已选用户的完整信息（用于 useGroupApi 模式下右侧直接显示名称，避免等待懒加载） */
  initialSelectedUsers?: UserItem[]
  minSelectCount?: number
  maxSelectCount?: number
  // 以下为向后兼容保留，useGroupApi=true 时忽略
  userType?: string
  useServerPagination?: boolean
  organizationId?: number
}>(), {
  title: "选择人员",
  useGroupApi: false,
  userList: () => [],
  selectedUserIds: () => [],
  initialSelectedUsers: () => [],
  minSelectCount: 1,
  maxSelectCount: 999
})

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void
  (e: "confirm", ids: number[], users: UserItem[]): void
  (e: "cancel"): void
}>()

const visible = ref(false)

// ===== 选中状态 =====
const selectedIds = ref<number[]>([])
// 用 reactive 对象保证属性增删触发响应式
const selectedUsersData = reactive<Record<number, UserItem>>({})
const selectedCount = computed(() => selectedIds.value.length)
const selectedUsersList = computed(() =>
  selectedIds.value.map(id => selectedUsersData[id] ?? { id, nickname: `#${id}` })
)

function isSelected(id: number) {
  return selectedIds.value.includes(id)
}

function selectUser(user: UserItem) {
  if (isSelected(user.id)) return
  if (selectedCount.value >= props.maxSelectCount) {
    ElMessage.warning(`最多只能选择 ${props.maxSelectCount} 人`)
    return
  }
  selectedIds.value.push(user.id)
  selectedUsersData[user.id] = user
}

function deselectUser(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx !== -1) selectedIds.value.splice(idx, 1)
  delete selectedUsersData[id]
}

function toggleSelect(user: UserItem) {
  isSelected(user.id) ? deselectUser(user.id) : selectUser(user)
}

function clearAllSelected() {
  ElMessageBox.confirm("确定要清空所有已选人员吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    selectedIds.value = []
    Object.keys(selectedUsersData).forEach(k => delete selectedUsersData[Number(k)])
  }).catch(() => {})
}

// ===== 分组懒加载模式 =====
const GROUP_PAGE_SIZE = 20
const searchKeyword = ref("")
const groupsLoading = ref(false)
const uniqueCount = ref(0)
const groups = ref<MemberGroup[]>([])
const expandedGroupKeys = ref<string[]>([])

// 按类型分段
const orgGroups = computed(() => groups.value.filter(g => g.groupType === "org"))
const roleGroups = computed(() => groups.value.filter(g => g.groupType === "role"))

// 两个 collapse 共享同一个 expandedGroupKeys，各自只更新自己类型的 key，避免互相覆盖
function updateExpandedKeys(type: "org" | "role", newKeys: string[]) {
  const otherKeys = expandedGroupKeys.value.filter(k => !k.startsWith(`${type}-`))
  expandedGroupKeys.value = [...otherKeys, ...newKeys.filter(k => k.startsWith(`${type}-`))]
}

interface GroupState {
  loading: boolean
  members: GroupMember[]
  total: number
  page: number
}
const groupState = reactive<Record<string, GroupState>>({})

function groupKey(g: MemberGroup) {
  return `${g.groupType}-${g.groupId}`
}

async function loadGroups() {
  groupsLoading.value = true
  try {
    const res = await getMemberGroupsApi({ nickname: searchKeyword.value || undefined })
    if (res.code === 0) {
      groups.value = res.data.groups
      uniqueCount.value = res.data.uniqueCount
    } else {
      ElMessage.error(res.msg)
    }
  } catch {
    ElMessage.error("加载分组失败")
  } finally {
    groupsLoading.value = false
  }
}

async function loadGroupMembers(group: MemberGroup, page = 1) {
  const key = groupKey(group)
  if (!groupState[key]) {
    groupState[key] = { loading: true, members: [], total: 0, page: 1 }
  } else {
    groupState[key].loading = true
  }
  try {
    const res = await getMemberGroupMembersApi(group.groupType, group.groupId, {
      page,
      pageSize: GROUP_PAGE_SIZE,
      nickname: searchKeyword.value || undefined
    })
    if (res.code === 0) {
      groupState[key] = { loading: false, members: res.data.members, total: res.data.total, page: res.data.page }
      // 自动补全已选用户的数据（用于右侧显示）
      res.data.members.forEach(m => {
        if (isSelected(m.id)) selectedUsersData[m.id] = m
      })
    } else {
      ElMessage.error(res.msg)
      groupState[key].loading = false
    }
  } catch {
    ElMessage.error("加载成员失败")
    if (groupState[key]) groupState[key].loading = false
  }
}

// 展开分组时懒加载成员
watch(expandedGroupKeys, (keys) => {
  keys.forEach(key => {
    if (!groupState[key]) {
      const group = groups.value.find(g => groupKey(g) === key)
      if (group) loadGroupMembers(group, 1)
    }
  })
})

function handleGroupPageChange(group: MemberGroup, page: number) {
  loadGroupMembers(group, page)
}

// 分组全选复选框状态
function getGroupCheckState(group: MemberGroup): { checked: boolean; indeterminate: boolean } {
  const key = groupKey(group)
  const state = groupState[key]
  if (!state || !state.members.length) return { checked: false, indeterminate: false }
  const count = state.members.filter(m => isSelected(m.id)).length
  if (count === 0) return { checked: false, indeterminate: false }
  if (count === state.members.length) return { checked: true, indeterminate: false }
  return { checked: false, indeterminate: true }
}

async function toggleGroupSelect(group: MemberGroup) {
  const key = groupKey(group)
  // 未加载过则先加载
  if (!groupState[key] || !groupState[key].members.length) {
    await loadGroupMembers(group, 1)
    if (!expandedGroupKeys.value.includes(key)) {
      expandedGroupKeys.value = [...expandedGroupKeys.value, key]
    }
  }
  const state = groupState[key]
  if (!state) return
  const allSelected = state.members.every(m => isSelected(m.id))
  if (allSelected) {
    state.members.forEach(m => deselectUser(m.id))
  } else {
    state.members.forEach(m => selectUser(m))
  }
}

// ===== 本地模式 =====
const filteredLocalList = ref<UserItem[]>([])

// ===== 搜索 =====
function handleSearch() {
  if (props.useGroupApi) {
    expandedGroupKeys.value = []
    Object.keys(groupState).forEach(k => delete groupState[k])
    loadGroups()
  } else {
    if (!searchKeyword.value) {
      filteredLocalList.value = [...props.userList]
    } else {
      const kw = searchKeyword.value
      filteredLocalList.value = props.userList.filter(u =>
        u.nickname?.includes(kw) || u.email?.includes(kw)
      )
    }
  }
}

// ===== 打开/关闭 =====
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    selectedIds.value = [...props.selectedUserIds]
    Object.keys(selectedUsersData).forEach(k => delete selectedUsersData[Number(k)])
    // 用传入的初始用户信息预填名称，避免右侧显示 #id fallback
    props.initialSelectedUsers.forEach(u => { selectedUsersData[u.id] = u })
    searchKeyword.value = ""
    expandedGroupKeys.value = []

    if (props.useGroupApi) {
      groups.value = []
      Object.keys(groupState).forEach(k => delete groupState[k])
      uniqueCount.value = 0
      loadGroups()
    } else {
      filteredLocalList.value = [...props.userList]
    }
  }
})

function confirmSelection() {
  if (selectedCount.value < props.minSelectCount) {
    ElMessage.warning(`至少需要选择 ${props.minSelectCount} 人`)
    return
  }
  if (selectedCount.value > props.maxSelectCount) {
    ElMessage.warning(`最多只能选择 ${props.maxSelectCount} 人`)
    return
  }
  emit("confirm", [...selectedIds.value], Object.values(selectedUsersData))
  handleClose()
}

function handleClose() {
  visible.value = false
  emit("update:modelValue", false)
  emit("cancel")
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="800px" @close="handleClose">
    <div class="select-modal">
      <!-- 搜索栏 -->
      <div class="search-area">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入姓名或邮箱"
          clearable
          style="width: 260px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" size="small" @click="handleSearch">
          搜索
        </el-button>
      </div>

      <!-- 主内容区 -->
      <div class="content-area">
        <!-- 左侧：分组树 or 平铺列表 -->
        <div class="panel left-panel">
          <!-- 分组懒加载模式 -->
          <template v-if="useGroupApi">
            <div class="panel-header">
              <span>可选人员</span>
              <span class="panel-count">共 {{ uniqueCount }} 人</span>
            </div>
            <div v-loading="groupsLoading" class="panel-body">
              <el-empty v-if="!groupsLoading && groups.length === 0" description="暂无数据" :image-size="60" />
              <template v-else>
                <!-- 小组分段 -->
                <template v-if="orgGroups.length > 0">
                  <div class="section-label">小组</div>
                  <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
                  <el-collapse :model-value="(expandedGroupKeys as any)" @update:model-value="(v: any) => updateExpandedKeys('org', v)">
                    <el-collapse-item
                      v-for="group in orgGroups"
                      :key="groupKey(group)"
                      :name="groupKey(group)"
                    >
                      <template #title>
                        <el-checkbox
                          :model-value="getGroupCheckState(group).checked"
                          :indeterminate="getGroupCheckState(group).indeterminate"
                          class="group-checkbox"
                          @click.stop
                          @change="toggleGroupSelect(group)"
                        />
                        <span class="group-title">{{ group.groupName }}</span>
                        <el-badge :value="group.count" class="group-badge" />
                      </template>
                      <div v-loading="groupState[groupKey(group)]?.loading">
                        <template v-if="groupState[groupKey(group)]?.members?.length">
                          <div
                            v-for="member in groupState[groupKey(group)].members"
                            :key="member.id"
                            class="member-item"
                            :class="{ selected: isSelected(member.id) }"
                            @click="toggleSelect(member)"
                          >
                            <el-checkbox :model-value="isSelected(member.id)" @click.stop @change="() => toggleSelect(member)" />
                            <div class="member-info">
                              <div class="member-name-row">
                                <span class="member-name">{{ member.nickname }}</span>
                                <span v-if="member.isOrgLeader" class="user-type-tag leader-tag">组长</span>
                                <span v-for="label in member.userTypeLabels" :key="label" class="user-type-tag">{{ label }}</span>
                              </div>
                              <span class="member-email">{{ member.email }}</span>
                            </div>
                          </div>
                          <el-pagination
                            v-if="groupState[groupKey(group)].total > GROUP_PAGE_SIZE"
                            background
                            layout="prev, pager, next"
                            :total="groupState[groupKey(group)].total"
                            :page-size="GROUP_PAGE_SIZE"
                            :current-page="groupState[groupKey(group)].page"
                            size="small"
                            class="group-pagination"
                            @current-change="(page: number) => handleGroupPageChange(group, page)"
                          />
                        </template>
                        <div v-else-if="!groupState[groupKey(group)]?.loading" class="no-data">
                          暂无成员
                        </div>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </template>

                <!-- 角色分段 -->
                <template v-if="roleGroups.length > 0">
                  <div class="section-label">角色</div>
                  <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
                  <el-collapse :model-value="(expandedGroupKeys as any)" @update:model-value="(v: any) => updateExpandedKeys('role', v)">
                    <el-collapse-item
                      v-for="group in roleGroups"
                      :key="groupKey(group)"
                      :name="groupKey(group)"
                    >
                      <template #title>
                        <el-checkbox
                          :model-value="getGroupCheckState(group).checked"
                          :indeterminate="getGroupCheckState(group).indeterminate"
                          class="group-checkbox"
                          @click.stop
                          @change="toggleGroupSelect(group)"
                        />
                        <span class="group-title">{{ group.groupName }}</span>
                        <el-badge :value="group.count" class="group-badge" />
                      </template>
                      <div v-loading="groupState[groupKey(group)]?.loading">
                        <template v-if="groupState[groupKey(group)]?.members?.length">
                          <div
                            v-for="member in groupState[groupKey(group)].members"
                            :key="member.id"
                            class="member-item"
                            :class="{ selected: isSelected(member.id) }"
                            @click="toggleSelect(member)"
                          >
                            <el-checkbox :model-value="isSelected(member.id)" @click.stop @change="() => toggleSelect(member)" />
                            <div class="member-info">
                              <div class="member-name-row">
                                <span class="member-name">{{ member.nickname }}</span>
                                <span v-if="member.isOrgLeader" class="user-type-tag leader-tag">组长</span>
                                <span v-for="label in member.userTypeLabels" :key="label" class="user-type-tag">{{ label }}</span>
                              </div>
                              <span class="member-email">{{ member.email }}</span>
                            </div>
                          </div>
                          <el-pagination
                            v-if="groupState[groupKey(group)].total > GROUP_PAGE_SIZE"
                            background
                            layout="prev, pager, next"
                            :total="groupState[groupKey(group)].total"
                            :page-size="GROUP_PAGE_SIZE"
                            :current-page="groupState[groupKey(group)].page"
                            size="small"
                            class="group-pagination"
                            @current-change="(page: number) => handleGroupPageChange(group, page)"
                          />
                        </template>
                        <div v-else-if="!groupState[groupKey(group)]?.loading" class="no-data">
                          暂无成员
                        </div>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </template>
              </template>
            </div>
          </template>

          <!-- 本地平铺模式 -->
          <template v-else>
            <div class="panel-header">
              <span>可选人员</span>
              <span class="panel-count">{{ filteredLocalList.length }} 条记录</span>
            </div>
            <div class="panel-body">
              <div
                v-for="user in filteredLocalList"
                :key="user.id"
                class="member-item"
                :class="{ selected: isSelected(user.id) }"
                @click="toggleSelect(user)"
              >
                <el-checkbox :model-value="isSelected(user.id)" @click.stop />
                <div class="member-info">
                  <span class="member-name">{{ user.nickname }}</span>
                  <span class="member-email">{{ user.email }}</span>
                </div>
              </div>
              <div v-if="filteredLocalList.length === 0" class="no-data">
                暂无数据
              </div>
            </div>
          </template>
        </div>

        <!-- 右侧：已选人员 -->
        <div class="panel right-panel">
          <div class="panel-header">
            <span>已选 {{ selectedCount }} 人</span>
            <el-button v-if="selectedCount > 0" type="primary" link size="small" @click="clearAllSelected">
              全部移除
            </el-button>
          </div>
          <div class="panel-body">
            <div
              v-for="user in selectedUsersList"
              :key="user.id"
              class="selected-item"
            >
              <span class="member-name">{{ user.nickname }}</span>
              <el-icon class="remove-icon" @click="deselectUser(user.id)">
                <Close />
              </el-icon>
            </div>
            <div v-if="selectedCount === 0" class="no-data">
              暂无选择
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="modal-footer">
        <el-button @click="handleClose">
          取消
        </el-button>
        <el-button type="primary" @click="confirmSelection">
          确认
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.select-modal {
  padding: 4px 0 0;
}

.search-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.content-area {
  display: flex;
  height: 460px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.left-panel {
  border-right: 1px solid #e4e7ed;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-size: 13px;
  color: #303133;
  border-bottom: 1px solid #f0f2f5;
  background: #fafafa;
  flex-shrink: 0;
}

.panel-count {
  color: #909399;
  font-size: 12px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

/* 分段标题 */
.section-label {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #909399;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  position: sticky;
  top: 0;
  z-index: 1;
}

/* 分组 */
.group-checkbox {
  margin-right: 8px;
}

.group-title {
  font-size: 13px;
  font-weight: 500;
}

.group-badge {
  margin-left: 8px;
}

.group-badge :deep(.el-badge__content) {
  font-size: 11px;
}

.group-pagination {
  padding: 8px 12px;
  justify-content: center;
}

/* 成员行 */
.member-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.15s;
  gap: 10px;
}

.member-item:hover {
  background: #f5f7fa;
}

.member-item.selected {
  background: #ecf5ff;
}

.member-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.member-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.member-name {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-type-tag {
  font-size: 11px;
  color: #409eff;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 18px;
  white-space: nowrap;
  flex-shrink: 0;
}

.leader-tag {
  color: #67c23a;
  background: #f0f9eb;
  border-color: #c2e7b0;
}

.member-email {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 已选项 */
.selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-bottom: 1px solid #f5f5f5;
}

.remove-icon {
  cursor: pointer;
  color: #c0c4cc;
  flex-shrink: 0;
  font-size: 14px;
}

.remove-icon:hover {
  color: #f56c6c;
}

.no-data {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 30px 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

/* el-collapse 样式微调 */
:deep(.el-collapse) {
  border: none;
}
:deep(.el-collapse-item__header) {
  padding: 0 12px;
  font-size: 13px;
  border-bottom-color: #f0f2f5;
}
:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}
:deep(.el-collapse-item__content) {
  padding: 0;
}
</style>