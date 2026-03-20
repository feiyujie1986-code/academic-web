<script lang="ts" setup>
import type { roleDataModel } from "@/api/authority/role"
import type { RoleInfo, UserCandidate } from "@/api/authority/user"
import type { classListItem } from "@/api/class/class"
import type { CommunityModel } from "@/api/im/community"
import type { OrganizationModel } from "@/api/organization/organization"
import { ElMessage } from "element-plus"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { getRolesApi } from "@/api/authority/role"
import { getUserCandidatesApi } from "@/api/authority/user"
import { getClasssApi } from "@/api/class/class"
import { getCommunitiesApi } from "@/api/im/community"
import { getOrganizationsApi } from "@/api/organization/organization"

const props = withDefaults(defineProps<Props>(), {
  selectedItems: () => []
})
// Emits
const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  "confirm": [selectedItems: SelectedItem[]]
}>()
// ==================== 响应式弹窗尺寸 ====================
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)

function handleResize() {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

onMounted(() => window.addEventListener("resize", handleResize))
onUnmounted(() => window.removeEventListener("resize", handleResize))

// 动态计算弹窗样式
const dialogStyle = computed(() => {
  const vw = windowWidth.value
  const vh = windowHeight.value

  // 宽度计算：大屏720px，中屏留80px边距，小屏留40px边距
  let width: number
  if (vw >= 800) {
    width = 720
  } else if (vw >= 600) {
    width = vw - 80
  } else {
    width = vw - 40
  }

  // 高度计算：上下各留60px（小屏40px）
  const verticalMargin = vw < 600 ? 40 : 60
  const maxHeight = vh - verticalMargin * 2
  const height = Math.min(680, maxHeight)

  // 内容区高度 = 弹窗高度 - header(56px) - footer(73px) - body padding(32px)
  const contentHeight = height - 161

  return {
    "--dialog-width": `${width}px`,
    "--dialog-height": `${height}px`,
    "--content-height": `${contentHeight}px`
  }
})

// 是否为小屏幕（竖向布局）
const isSmallScreen = computed(() => windowWidth.value < 600)

// 目标类型
type TargetType = "user" | "class" | "community" | "organization"

// 统一的已选项目类型
export interface SelectedItem {
  id: number
  name: string
  count?: number // 人数（班级/社区用）
  avatar?: string // 头像（人员用）
  roles?: RoleInfo[] // 角色列表（人员用）
}

// Props
interface Props {
  modelValue: boolean
  targetType: TargetType
  selectedItems?: SelectedItem[]
  customTitle?: string // 自定义标题，不传则使用默认标题
}

// 弹窗标题映射
const titleMap: Record<TargetType, string> = {
  user: "选择人员",
  class: "选择班级",
  community: "选择亚社区",
  organization: "选择机构"
}

// 计算弹窗标题
const dialogTitle = computed(() => {
  return props.customTitle || titleMap[props.targetType]
})

// 显示列名称映射
const nameColumnMap: Record<TargetType, string> = {
  user: "人员",
  class: "班级",
  community: "亚社区",
  organization: "机构"
}

// 弹窗可见状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit("update:modelValue", val)
})

// 搜索关键词
const keyword = ref("")

// 加载状态
const loading = ref(false)

// 候选列表数据
const candidateList = ref<SelectedItem[]>([])

// 已选中的 ID 集合
const selectedIds = ref<Set<number>>(new Set())

// ==================== 角色筛选（仅用户类型）====================
const roleList = ref<roleDataModel[]>([])
const selectedRoleIds = ref<number[]>([])
const roleLoading = ref(false)

// 获取角色列表
async function fetchRoles() {
  roleLoading.value = true
  try {
    const res = await getRolesApi()
    if (res.code === 0) {
      roleList.value = res.data
    }
  } catch (error) {
    console.error("获取角色列表失败", error)
  } finally {
    roleLoading.value = false
  }
}

// 角色选择变化时重新获取用户列表
function handleRoleChange() {
  fetchCandidates()
}

// 获取角色标签样式（参考社区中心人员管理）
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

// ==================== 候选列表 ====================

// 已选列表（带详细信息）
const selectedList = computed(() => {
  return candidateList.value.filter(item => selectedIds.value.has(item.id))
})

// 是否全选
const isAllSelected = computed(() => {
  if (candidateList.value.length === 0) return false
  return candidateList.value.every(item => selectedIds.value.has(item.id))
})

// 全选/取消全选
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    candidateList.value.forEach(item => selectedIds.value.add(item.id))
  }
}

// 切换单项选中状态
function toggleSelect(item: SelectedItem) {
  if (selectedIds.value.has(item.id)) {
    selectedIds.value.delete(item.id)
  } else {
    selectedIds.value.add(item.id)
  }
}

// 移除已选项
function removeSelected(item: SelectedItem) {
  selectedIds.value.delete(item.id)
}

// 获取候选列表数据
async function fetchCandidates() {
  loading.value = true
  try {
    let list: SelectedItem[] = []

    switch (props.targetType) {
      case "user": {
        // 使用新的用户候选列表 API，支持角色筛选
        const params: { roleIds?: string, page: number, pageSize: number } = {
          page: 1,
          pageSize: 1000
        }
        if (selectedRoleIds.value.length > 0) {
          params.roleIds = selectedRoleIds.value.join(",")
        }
        const res = await getUserCandidatesApi(params)
        if (res.code === 0) {
          list = res.data.list.map((item: UserCandidate) => ({
            id: item.id,
            name: item.nickname || item.email || `用户${item.id}`,
            avatar: item.avatar || "",
            roles: item.roles || []
          }))
        }
        break
      }
      case "class": {
        const res = await getClasssApi({ page: 1, pageSize: 1000 })
        if (res.code === 0) {
          list = res.data.list.map((item: classListItem) => ({
            id: item.classId,
            name: item.name,
            count: item.studentCount
          }))
        }
        break
      }
      case "community": {
        const res = await getCommunitiesApi({ page: 1, pageSize: 100 })
        if (res.code === 0) {
          list = res.data.list.map((item: CommunityModel) => ({
            id: item.id,
            name: item.name,
            count: item.memberCount
          }))
        }
        break
      }
      case "organization": {
        const res = await getOrganizationsApi({ page: 1, pageSize: 1000, name: "" })
        if (res.code === 0) {
          list = res.data.list.map((item: OrganizationModel) => ({
            id: item.id,
            name: item.name
          }))
        }
        break
      }
    }

    candidateList.value = list
  } catch (error) {
    console.error("获取候选列表失败", error)
    ElMessage.error("获取数据失败")
  } finally {
    loading.value = false
  }
}

// 搜索过滤后的候选列表
const filteredCandidateList = computed(() => {
  if (!keyword.value) {
    return candidateList.value
  }
  const kw = keyword.value.toLowerCase()
  return candidateList.value.filter(item =>
    item.name.toLowerCase().includes(kw)
  )
})

// 确认选择
function handleConfirm() {
  const selected = candidateList.value.filter(item => selectedIds.value.has(item.id))
  emit("confirm", selected)
  dialogVisible.value = false
}

// 取消
function handleCancel() {
  dialogVisible.value = false
}

// 监听弹窗打开，加载数据
watch(dialogVisible, (visible) => {
  if (visible) {
    keyword.value = ""
    selectedRoleIds.value = []
    // 初始化已选状态
    selectedIds.value = new Set(props.selectedItems.map(item => item.id))
    // 如果是用户类型，先获取角色列表
    if (props.targetType === "user") {
      fetchRoles()
    }
    fetchCandidates()
  }
})

// 获取已选统计文字
const selectedCountText = computed(() => {
  const count = selectedIds.value.size
  switch (props.targetType) {
    case "user":
      return `已选：${count}人`
    case "class":
      return `已选：${count}个班级`
    case "community":
      return `已选：${count}个亚社区`
    case "organization":
      return `已选：${count}个机构`
    default:
      return `已选：${count}项`
  }
})

// 获取总数统计文字
const totalCountText = computed(() => {
  const count = candidateList.value.length
  switch (props.targetType) {
    case "user":
      return `全部(${count}人)`
    case "class":
      return `全部(${count}个)`
    case "community":
      return `全部(${count}个)`
    case "organization":
      return `全部(${count}个)`
    default:
      return `全部(${count})`
  }
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :close-on-click-modal="false"
    :style="dialogStyle"
    class="select-target-dialog"
    align-center
  >
    <div v-loading="loading" class="select-target-container" :class="[{ 'is-small-screen': isSmallScreen }]">
      <!-- 左侧候选列表 -->
      <div class="candidate-panel">
        <div class="search-box">
          <!-- 角色筛选（仅用户类型显示） -->
          <el-select
            v-if="targetType === 'user'"
            v-model="selectedRoleIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="按角色筛选"
            clearable
            :loading="roleLoading"
            style="width: 100%; margin-bottom: 8px"
            @change="handleRoleChange"
          >
            <el-option
              v-for="role in roleList"
              :key="role.id"
              :label="role.roleName"
              :value="role.id"
            />
          </el-select>
          <el-input
            v-model="keyword"
            :placeholder="`请输入${nameColumnMap[targetType]}名称`"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="candidate-list">
          <div
            v-for="item in filteredCandidateList"
            :key="item.id"
            class="candidate-item"
            @click="toggleSelect(item)"
          >
            <el-checkbox
              :model-value="selectedIds.has(item.id)"
              @click.stop
              @change="toggleSelect(item)"
            />
            <el-tooltip :content="item.name" placement="top" :show-after="300" :disabled="item.name.length <= 18">
              <span class="item-name">{{ item.name }}</span>
            </el-tooltip>
            <!-- 角色标签（仅用户类型显示） -->
            <template v-if="targetType === 'user' && item.roles && item.roles.length > 0">
              <el-tag
                v-for="role in item.roles"
                :key="role.roleId"
                size="small"
                class="role-tag"
                :style="getRoleTagStyle(role.roleName)"
              >
                {{ role.roleName }}
              </el-tag>
            </template>
            <span v-if="item.count !== undefined && targetType !== 'class' && targetType !== 'community'" class="item-count">({{ item.count }})</span>
          </div>
          <el-empty v-if="filteredCandidateList.length === 0" description="暂无数据" :image-size="60" />
        </div>
        <div class="select-all-row">
          <el-checkbox
            :model-value="isAllSelected"
            :indeterminate="selectedIds.size > 0 && !isAllSelected"
            @change="toggleSelectAll"
          />
          <span class="select-all-text">{{ totalCountText }}</span>
        </div>
      </div>

      <!-- 右侧已选列表 -->
      <div class="selected-panel">
        <div class="selected-header">
          {{ selectedCountText }}
        </div>
        <div class="selected-list">
          <div
            v-for="item in selectedList"
            :key="item.id"
            class="selected-item"
          >
            <div class="item-info">
              <el-avatar v-if="targetType === 'user'" :size="32">
                {{ item.name.charAt(0) }}
              </el-avatar>
              <el-tooltip :content="item.name" placement="top" :show-after="300" :disabled="item.name.length <= 16">
                <span class="item-name">{{ item.name }}</span>
              </el-tooltip>
            </div>
            <el-icon class="remove-icon" @click="removeSelected(item)">
              <Close />
            </el-icon>
          </div>
          <el-empty v-if="selectedList.length === 0" description="请选择" :image-size="60" />
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">
        取消
      </el-button>
      <el-button type="primary" @click="handleConfirm">
        确认
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss">
// 弹窗全局样式（不加 scoped，确保能覆盖 Element Plus 默认样式）
.select-target-dialog {
  // 弹窗尺寸和居中（使用绝对定位 + transform）
  &.el-dialog {
    width: var(--dialog-width) !important;
    max-height: var(--dialog-height);
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    overflow: hidden;
    // 绝对定位居中
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    margin: 0 !important;
  }

  // 弹窗头部
  .el-dialog__header {
    flex-shrink: 0;
    padding: 16px 20px;
    margin: 0;
    border-bottom: 1px solid #e4e7ed;
  }

  // 内容区自适应
  .el-dialog__body {
    flex: 1;
    overflow: hidden;
    padding: 16px 20px;
  }

  // 弹窗底部
  .el-dialog__footer {
    flex-shrink: 0;
    padding: 12px 20px;
    border-top: 1px solid #e4e7ed;
  }
}
</style>

<style scoped lang="scss">
.select-target-container {
  display: flex;
  gap: 16px;
  height: var(--content-height);

  // 小屏幕竖向布局
  &.is-small-screen {
    flex-direction: column;

    .selected-panel {
      width: 100%;
      max-height: 180px;
      flex-shrink: 0;
    }

    .candidate-panel {
      flex: 1;
      min-height: 0;
    }

    .candidate-item .item-name {
      max-width: 180px;
    }
  }
}

.candidate-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  min-height: 0; // 允许 flex 子项收缩
}

.search-box {
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.candidate-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 0; // 允许滚动
}

.candidate-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f7fa;
  }

  .item-name {
    margin-left: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 260px;
  }

  .role-tag {
    margin-left: 4px;
    flex-shrink: 0;
  }

  .item-count {
    color: #909399;
    font-size: 12px;
    margin-left: auto;
  }
}

.select-all-row {
  display: flex;
  align-items: center;
  padding: 12px;
  border-top: 1px solid #e4e7ed;
  background-color: #fafafa;
  flex-shrink: 0;

  .select-all-text {
    margin-left: 8px;
    color: #606266;
  }
}

.selected-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.selected-header {
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 500;
  color: #303133;
  flex-shrink: 0;
}

.selected-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 0;
}

.selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;

  .item-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    overflow: hidden;

    .item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .remove-icon {
    cursor: pointer;
    color: #909399;
    flex-shrink: 0;

    &:hover {
      color: #f56c6c;
    }
  }
}
</style>
