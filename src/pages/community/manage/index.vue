<script lang="ts" setup>
import type { CommunityModel, CommunityStatistics } from "@/api/im/community"
import cooperativeHeaderBg from "@@/assets/images/cooperative-community-head-back.png"
import staffHeaderBg from "@@/assets/images/Staff-community-head-back.png"
import trainingHeaderBg from "@@/assets/images/training-community-header-back.png"
import { formatDateTime } from "@@/utils/datetime"
import { ElMessage, ElMessageBox } from "element-plus"
import { computed, onMounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  CommunityType,
  CommunityTypeDescriptions,
  CommunityTypeLabels,
  createCommunityApi,
  deleteCommunityApi,
  getCommunitiesApi,
  getCommunityStatisticsApi,
  updateCommunityApi
} from "@/api/im/community"
import CommunityConversationTab from "./components/CommunityConversationTab.vue"
import CommunityMemberTab from "./components/CommunityMemberTab.vue"

const route = useRoute()
const router = useRouter()

// 当前社区类型
const communityType = computed(() => {
  const type = Number(route.params.type)
  return type as CommunityType
})

// 类型对应的 key
const statsKey = computed(() => {
  switch (communityType.value) {
    case CommunityType.Training:
      return "training"
    case CommunityType.Cooperation:
      return "cooperation"
    case CommunityType.Employee:
      return "employee"
    default:
      return "training"
  }
})

// 进度条颜色
const progressColor = computed(() => {
  switch (communityType.value) {
    case CommunityType.Training:
      return "#409EFF" // 蓝色
    case CommunityType.Cooperation:
      return "#B385DB" // 紫色
    case CommunityType.Employee:
      return "#67C23A" // 绿色
    default:
      return "#409EFF"
  }
})

// 头部背景图
const headerBgImage = computed(() => {
  switch (communityType.value) {
    case CommunityType.Training:
      return trainingHeaderBg
    case CommunityType.Cooperation:
      return cooperativeHeaderBg
    case CommunityType.Employee:
      return staffHeaderBg
    default:
      return trainingHeaderBg
  }
})

// 是否为合作社区
const isCooperationType = computed(() => communityType.value === CommunityType.Cooperation)

// 是否为员工社区
const isEmployeeType = computed(() => communityType.value === CommunityType.Employee)

// 是否可以创建亚社区（事工社区和员工社区）
const canCreateCommunity = computed(() => isCooperationType.value || isEmployeeType.value)

// 对话框提示信息
const dialogTipText = computed(() => {
  if (isCooperationType.value) {
    return "赋能各事工的高效联动，用于事工交流"
  }
  return "面向内部的沟通社区，用于日常工作交流"
})

// 创建亚社区对话框
const createDialogVisible = ref(false)
const createLoading = ref(false)
const createForm = reactive({
  name: "",
  description: ""
})

// 编辑亚社区对话框
const editDialogVisible = ref(false)
const editLoading = ref(false)
const editForm = reactive({
  name: "",
  description: ""
})

// 打开创建对话框
function openCreateDialog() {
  createForm.name = ""
  createForm.description = ""
  createDialogVisible.value = true
}

// 创建亚社区
async function handleCreateCommunity() {
  if (!createForm.name.trim()) {
    ElMessage.warning("请输入亚社区名称")
    return
  }
  createLoading.value = true
  try {
    const res = await createCommunityApi({
      name: createForm.name.trim(),
      description: createForm.description.trim(),
      type: communityType.value
    })
    if (res.code === 0) {
      ElMessage.success("创建成功")
      createDialogVisible.value = false
      fetchCommunities()
      fetchStatistics()
    }
  } catch (err) {
    console.error("创建亚社区失败", err)
  } finally {
    createLoading.value = false
  }
}

// 打开编辑对话框
function openEditDialog() {
  if (!selectedCommunity.value) return
  editForm.name = selectedCommunity.value.name
  editForm.description = selectedCommunity.value.description || ""
  editDialogVisible.value = true
}

// 保存编辑
async function handleEditCommunity() {
  if (!editForm.name.trim()) {
    ElMessage.warning("请输入亚社区名称")
    return
  }
  if (!selectedCommunity.value) return
  editLoading.value = true
  try {
    const res = await updateCommunityApi(selectedCommunity.value.id, {
      name: editForm.name.trim(),
      description: editForm.description.trim()
    })
    if (res.code === 0) {
      ElMessage.success("保存成功")
      editDialogVisible.value = false
      fetchCommunities()
    }
  } catch (err) {
    console.error("编辑亚社区失败", err)
  } finally {
    editLoading.value = false
  }
}

// 删除亚社区
const deleteLoading = ref(false)

async function handleDeleteCommunity() {
  if (!selectedCommunity.value) return
  const community = selectedCommunity.value
  const tipMessage = community.classId != null
    ? "删除亚社区不会同步删除班级，班级变更会同步创建新的亚社区。<br/>此操作不可撤销。"
    : "删除后社区及群组将全部移除，此操作不可撤销。"

  try {
    await ElMessageBox.confirm(tipMessage, "确认删除亚社区？", {
      type: "warning",
      dangerouslyUseHTMLString: true,
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonClass: "el-button--danger"
    })
  } catch {
    return // 用户取消
  }

  deleteLoading.value = true
  try {
    const res = await deleteCommunityApi(community.id)
    if (res.code === 0) {
      ElMessage.success("删除成功")
      selectedCommunityId.value = null
      fetchCommunities()
      fetchStatistics()
    }
  } catch (err) {
    console.error("删除亚社区失败", err)
    ElMessage.error("删除失败")
  } finally {
    deleteLoading.value = false
  }
}

// 统计数据
const statistics = ref<CommunityStatistics | null>(null)

// 社区列表
const communities = ref<CommunityModel[]>([])
const listLoading = ref(false)
const total = ref(0)

// 当前选中的社区
const selectedCommunityId = ref<number | null>(null)
const selectedCommunity = computed(() => {
  if (!selectedCommunityId.value) return null
  return communities.value.find(c => c.id === selectedCommunityId.value) || null
})

// Tab 相关状态
const activeTab = ref("members")
const loadedTabs = ref<Set<string>>(new Set(["members"]))
const memberCount = ref(0)
const conversationCount = ref(0)

// Tab 懒加载
watch(activeTab, (newTab: string) => {
  if (!loadedTabs.value.has(newTab)) {
    loadedTabs.value.add(newTab)
  }
})

// 社区切换时重置 Tab 状态，并初始化数量
watch(selectedCommunityId, () => {
  activeTab.value = "members"
  loadedTabs.value = new Set(["members"])
  // 从选中的社区数据中获取初始数量
  if (selectedCommunity.value) {
    memberCount.value = selectedCommunity.value.memberCount
    conversationCount.value = selectedCommunity.value.conversationCount
  } else {
    memberCount.value = 0
    conversationCount.value = 0
  }
})

// 更新成员数量
function handleMemberCountUpdate(count: number) {
  memberCount.value = count
}

// 更新群组数量
function handleConversationCountUpdate(count: number) {
  conversationCount.value = count
}

// 获取统计数据
async function fetchStatistics() {
  try {
    const res = await getCommunityStatisticsApi()
    if (res.code === 0 && res.data) {
      statistics.value = res.data
    }
  } catch (err) {
    console.error("获取社区统计数据失败", err)
  }
}

// 获取社区列表
async function fetchCommunities() {
  listLoading.value = true
  try {
    const res = await getCommunitiesApi({
      type: communityType.value,
      page: 1,
      pageSize: 100 // 获取全部
    })
    if (res.code === 0 && res.data) {
      communities.value = res.data.list
      total.value = res.data.total
    }
  } catch (err) {
    console.error("获取社区列表失败", err)
  } finally {
    listLoading.value = false
  }
}

// 选择社区
function selectCommunity(community: CommunityModel) {
  selectedCommunityId.value = community.id
}

// 返回社区设置
function goBack() {
  router.push("/community/list")
}

// 获取当前类型的统计数据
function getCurrentStats() {
  if (!statistics.value) {
    return { communityCount: 0, uniqueMemberCount: 0, conversationCount: 0 }
  }
  return statistics.value[statsKey.value]
}

// 监听路由变化
watch(
  () => route.params.type,
  () => {
    selectedCommunityId.value = null
    fetchCommunities()
    fetchStatistics()
  }
)

onMounted(() => {
  fetchCommunities()
  fetchStatistics()
})
</script>

<template>
  <div class="community-manage">
    <!-- 面包屑 -->
    <div class="breadcrumb">
      <span class="breadcrumb-item clickable" @click="goBack">社区中心</span>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item active">{{ CommunityTypeLabels[communityType] }}管理</span>
    </div>

    <!-- 页面头部 -->
    <div class="page-header" :style="{ backgroundImage: `url(${headerBgImage})` }">
      <h1 class="page-title">
        {{ CommunityTypeLabels[communityType] }}管理
      </h1>
      <p class="page-description">
        {{ CommunityTypeDescriptions[communityType] }}
      </p>
    </div>

    <!-- 主体内容 -->
    <div class="main-content">
      <!-- 左侧列表 -->
      <div class="left-panel">
        <!-- 列表头部 -->
        <div class="list-header" :class="{ 'no-border': canCreateCommunity }">
          <div class="header-info">
            <img src="@@/assets/images/sub-community-icon-new.png" alt="" class="header-icon-img">
            <div class="header-text">
              <div class="header-title">
                {{ CommunityTypeLabels[communityType] }}管理
              </div>
              <div class="header-count">
                {{ getCurrentStats().communityCount }}个亚社区
              </div>
            </div>
          </div>
          <div v-if="!canCreateCommunity" class="header-progress" :style="{ backgroundColor: progressColor }" />
        </div>

        <!-- 创建亚社区按钮（合作社区和员工社区） -->
        <div v-if="canCreateCommunity" class="create-btn-wrapper">
          <el-button type="primary" class="create-btn" @click="openCreateDialog">
            创建亚社区
          </el-button>
          <div class="header-progress" :style="{ backgroundColor: progressColor }" />
        </div>

        <!-- 社区列表 -->
        <div v-loading="listLoading" class="community-list">
          <div
            v-for="community in communities"
            :key="community.id"
            class="community-item"
            :class="{ active: selectedCommunityId === community.id }"
            @click="selectCommunity(community)"
          >
            <div class="item-name" :title="community.name">
              {{ community.name }}
            </div>
            <div class="item-stats">
              <span>{{ community.memberCount }}个人员</span>
              <span>{{ community.conversationCount }}群组</span>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="!listLoading && communities.length === 0" class="empty-list">
            <el-empty description="暂无亚社区" />
          </div>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="right-panel">
        <!-- 未选择状态 -->
        <div v-if="!selectedCommunity" class="empty-state">
          <img src="@@/assets/images/training- community-null.png" alt="" class="empty-img">
          <p v-if="canCreateCommunity" class="empty-text">
            从左侧列表选择一个亚社区，或<span class="create-link" @click="openCreateDialog">创建</span>一个新的社区
          </p>
          <p v-else class="empty-text">
            从左侧列表选择一个亚社区
          </p>
        </div>

        <!-- 选中状态 - 社区详情 -->
        <div v-else class="community-detail">
          <!-- 社区头部 -->
          <div class="detail-header">
            <div class="header-main">
              <div class="header-icon">
                <span class="icon-text">{{ selectedCommunity.name.charAt(0) }}</span>
              </div>
              <div class="header-info">
                <h2 class="detail-title">
                  {{ selectedCommunity.name }}
                </h2>
                <p class="detail-time">
                  创建于{{ formatDateTime(selectedCommunity.createdAt * 1000).split(" ")[0] }}
                </p>
              </div>
            </div>
            <div class="header-actions">
              <el-button class="action-btn edit-btn" @click="openEditDialog">
                编辑
              </el-button>
              <el-button
                class="action-btn delete-btn"
                :loading="deleteLoading"
                @click="handleDeleteCommunity"
              >
                删除
              </el-button>
            </div>
          </div>

          <!-- Tab 切换 -->
          <el-tabs v-model="activeTab" class="community-tabs">
            <el-tab-pane :label="`人员管理(${memberCount})`" name="members">
              <CommunityMemberTab
                v-if="loadedTabs.has('members')"
                :community-id="selectedCommunity.id"
                :community-type="communityType"
                @update-count="handleMemberCountUpdate"
              />
            </el-tab-pane>
            <el-tab-pane :label="`群组管理(${conversationCount})`" name="conversations">
              <CommunityConversationTab
                v-if="loadedTabs.has('conversations')"
                :community-id="selectedCommunity.id"
                :community-name="selectedCommunity.name"
                :community-type="communityType"
                @update-count="handleConversationCountUpdate"
                @refresh-communities="fetchCommunities"
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <!-- 创建亚社区对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建亚社区"
      width="500px"
      :close-on-click-modal="false"
    >
      <!-- 提示信息 -->
      <div class="dialog-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ dialogTipText }}</span>
      </div>

      <el-form label-width="100px" class="create-form">
        <el-form-item label="亚社区名称" required>
          <el-input v-model="createForm.name" placeholder="请输入" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            placeholder="请输入"
            :rows="4"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateCommunity">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑亚社区对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑亚社区"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px" class="create-form">
        <el-form-item label="亚社区名称" required>
          <el-input v-model="editForm.name" placeholder="请输入" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            placeholder="请输入"
            :rows="4"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="editLoading" @click="handleEditCommunity">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.community-manage {
  padding: 20px;
  min-height: 100%;
  background-color: #f0f2f5;
  // 抵消 AppMain 的左右 padding
  margin: 0 -12px;
  padding-left: 32px;
  padding-right: 32px;
}

.breadcrumb {
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);

  .breadcrumb-item {
    color: var(--el-text-color-secondary);

    &.clickable {
      cursor: pointer;

      &:hover {
        color: var(--el-color-primary);
      }
    }

    &.active {
      color: var(--el-text-color-primary);
    }
  }

  .breadcrumb-separator {
    margin: 0 8px;
    color: var(--el-text-color-secondary);
  }
}

.page-header {
  margin-bottom: 20px;
  padding: 20px 24px;
  border-radius: 8px;
  background-color: #fff;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  .page-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .page-description {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.main-content {
  display: flex;
  gap: 20px;
  height: calc(100vh - 220px);
  min-height: 500px;
}

.left-panel {
  width: 320px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .list-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    position: relative;

    &.no-border {
      border-bottom: none;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 0;
    }

    .header-icon-img {
      width: 72px;
      height: 72px;
      border-radius: 8px;
      object-fit: cover;
    }

    .header-text {
      .header-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .header-count {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }

    .header-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
    }
  }

  .create-btn-wrapper {
    padding: 16px;
    position: relative;

    .create-btn {
      width: 100%;
    }

    .header-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
    }
  }

  .community-list {
    flex: 1;
    overflow-y: auto;
  }

  .community-item {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &.active {
      background-color: var(--el-color-primary-light-9);
    }

    .item-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      margin-bottom: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .empty-list {
    padding: 40px 20px;
  }
}

.right-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;

    .empty-img {
      width: 200px;
      height: auto;
      margin-bottom: 16px;
    }

    .empty-text {
      font-size: 14px;
      color: var(--el-text-color-secondary);
      margin: 0;

      .create-link {
        color: var(--el-color-primary);
        cursor: pointer;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }

  .community-detail {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .detail-header {
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--el-border-color-lighter);
      flex-shrink: 0;

      .header-main {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-icon {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        background: linear-gradient(135deg, #409eff 0%, #79bbff 100%);
        display: flex;
        align-items: center;
        justify-content: center;

        .icon-text {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }
      }

      .header-info {
        .detail-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 600;
          color: var(--el-text-color-primary);
        }

        .detail-time {
          margin: 0;
          font-size: 13px;
          color: var(--el-text-color-secondary);
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;

        .action-btn {
          height: 32px;
          padding: 0 14px;
          font-size: 13px;
          border-radius: 4px;
          border-width: 1px;
          border-style: solid;
          background-color: transparent;

          &.edit-btn {
            color: var(--el-color-primary);
            border-color: var(--el-color-primary);

            &:hover {
              background-color: var(--el-color-primary-light-9);
            }
          }

          &.delete-btn {
            color: var(--el-text-color-regular);
            border-color: var(--el-border-color);

            &:hover {
              color: var(--el-color-danger);
              border-color: var(--el-color-danger);
              background-color: var(--el-color-danger-light-9);
            }
          }
        }
      }
    }

    .community-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      :deep(.el-tabs__header) {
        margin: 0;
        padding: 0 24px;
        border-bottom: 1px solid var(--el-border-color-lighter);
      }

      :deep(.el-tabs__content) {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }

      :deep(.el-tab-pane) {
        height: 100%;
      }
    }
  }
}

// 创建亚社区对话框
.dialog-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-color-primary);

  .el-icon {
    font-size: 16px;
    flex-shrink: 0;
  }
}

.create-form {
  :deep(.el-form-item__label) {
    font-weight: normal;
  }
}
</style>
