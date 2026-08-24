<script lang="ts" setup>
import type {
  AuthorizationActionResult,
  AuthorizationFilter,
  AuthorizationOperation,
  AuthorizationOperationItem,
  AuthorizationPreview,
  AuthorizationTask,
  AuthorizationUserItem
} from "@/api/document/authorization"
import { onBeforeUnmount, reactive, ref, watch } from "vue"
import {
  createAuthorizationOperation,
  createAuthorizationPreview,
  executeAuthorizationAction,
  getAuthorizationOperation,
  getAuthorizationOperationItems,
  getAuthorizationUsers,
  retryAuthorizationOperation
} from "@/api/document/authorization"

const props = defineProps<{
  documentId: number
  documentName: string
  active: boolean
}>()

const categoryOptions = [
  { label: "长执", value: 8 },
  { label: "教师", value: 4 },
  { label: "会友", value: 2 },
  { label: "新人", value: 32 },
  { label: "事工同工", value: 16 },
  { label: "统筹同工", value: 1 }
]

const filter = reactive<AuthorizationFilter>({
  keyword: "",
  categoryIds: [],
  classIds: [],
  groupIds: []
})
const classIdsText = ref("")
const groupIdsText = ref("")
const list = ref<AuthorizationUserItem[]>([])
const loading = ref(false)
const loadError = ref(false)
const page = ref(1)
const pageSize = ref(50)
const total = ref(0)
const facets = reactive({ all: 0, authorized: 0, unauthorized: 0 })
const authorizationRevision = ref(0)
const sortBy = ref<"nickname" | "account" | "authorizedAt">("nickname")
const sortOrder = ref<"asc" | "desc">("asc")
const tableRef = ref<InstanceType<typeof import("element-plus")["ElTable"]> | null>(null)

const explicitRows = ref(new Map<number, AuthorizationUserItem>())
const selectionMode = ref<"explicit" | "filter">("explicit")
const selectionFilter = ref<AuthorizationFilter | null>(null)
const excludedUserIds = ref<number[]>([])
const selectionMatchedCount = ref(0)
const selectionChanging = ref(false)

const actionLoading = ref(false)
const preview = ref<AuthorizationPreview | null>(null)
const previewOperation = ref<AuthorizationOperation>("grant")
const previewVisible = ref(false)
const activeTask = ref<AuthorizationTask | null>(null)
const resultVisible = ref(false)
const actionResult = ref<AuthorizationActionResult | null>(null)
const detailItems = ref<AuthorizationOperationItem[]>([])
const detailTotal = ref(0)
const detailPage = ref(1)
const detailLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let pollingTimer: ReturnType<typeof setTimeout> | null = null

const explicitSelectedCount = computed(() => explicitRows.value.size)
const selectedCount = computed(() => selectionMode.value === "filter"
  ? Math.max(selectionMatchedCount.value - excludedUserIds.value.length, 0)
  : explicitSelectedCount.value)
const selectedRows = computed(() => [...explicitRows.value.values()])
const currentPageFullySelected = computed(() => list.value.length > 0 && list.value.every(item => explicitRows.value.has(item.userId)))
const selectedGrantCount = computed(() => selectedRows.value.filter(item => item.canGrant).length)
const selectedRevokeCount = computed(() => selectedRows.value.filter(item => item.canRevoke).length)
const taskPercentage = computed(() => {
  if (!activeTask.value?.total) return 0
  return Math.min(Math.round(activeTask.value.processed / activeTask.value.total * 100), 100)
})
const terminalStatuses = new Set(["completed", "failed", "conflict"])

function createIdempotencyKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0F) | 0x40
  bytes[8] = (bytes[8] & 0x3F) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"))
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`
}

function normalizedFilter(): AuthorizationFilter {
  const parseIds = (value: string) => value.split(",")
    .map(item => Number(item.trim()))
    .filter(item => Number.isInteger(item) && item > 0)
  return {
    keyword: filter.keyword?.trim() || undefined,
    authorizationStatus: filter.authorizationStatus,
    categoryIds: filter.categoryIds?.length ? [...filter.categoryIds] : undefined,
    classIds: parseIds(classIdsText.value).length ? parseIds(classIdsText.value) : undefined,
    groupIds: parseIds(groupIdsText.value).length ? parseIds(groupIdsText.value) : undefined,
    accountStatus: filter.accountStatus
  }
}

function clearSelection() {
  explicitRows.value = new Map()
  selectionMode.value = "explicit"
  selectionFilter.value = null
  excludedUserIds.value = []
  selectionMatchedCount.value = 0
  tableRef.value?.clearSelection()
}

async function fetchList() {
  if (!props.active || !props.documentId) return
  loading.value = true
  loadError.value = false
  try {
    const res = await getAuthorizationUsers(props.documentId, {
      ...normalizedFilter(),
      page: page.value,
      pageSize: pageSize.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    list.value = res.data.list
    total.value = res.data.total
    Object.assign(facets, res.data.facets)
    authorizationRevision.value = res.data.authorizationRevision
    await nextTick()
    restorePageSelection()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function restorePageSelection() {
  selectionChanging.value = true
  tableRef.value?.clearSelection()
  list.value.forEach((row) => {
    const selected = selectionMode.value === "filter"
      ? !excludedUserIds.value.includes(row.userId)
      : explicitRows.value.has(row.userId)
    if (selected) tableRef.value?.toggleRowSelection(row, true)
  })
  nextTick(() => selectionChanging.value = false)
}

function handleSelectionChange(rows: AuthorizationUserItem[]) {
  if (selectionChanging.value) return
  const visibleIds = new Set(list.value.map(item => item.userId))
  const selectedIds = new Set(rows.map(item => item.userId))
  if (selectionMode.value === "filter") {
    const exclusions = new Set(excludedUserIds.value)
    visibleIds.forEach((id) => {
      if (selectedIds.has(id)) exclusions.delete(id)
      else exclusions.add(id)
    })
    excludedUserIds.value = [...exclusions]
    return
  }
  const next = new Map(explicitRows.value)
  visibleIds.forEach(id => next.delete(id))
  rows.forEach(row => next.set(row.userId, row))
  explicitRows.value = next
}

function setStatus(status?: "authorized" | "unauthorized") {
  filter.authorizationStatus = status
  page.value = 1
  clearSelection()
  fetchList()
}

function applyFilter() {
  page.value = 1
  clearSelection()
  fetchList()
}

function handleKeywordInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilter, 300)
}

function resetFilter() {
  filter.keyword = ""
  filter.authorizationStatus = undefined
  filter.categoryIds = []
  filter.classIds = []
  filter.groupIds = []
  classIdsText.value = ""
  groupIdsText.value = ""
  filter.accountStatus = undefined
  sortBy.value = "nickname"
  sortOrder.value = "asc"
  applyFilter()
}

function handleSortChange({ prop, order }: { prop: string, order: string | null }) {
  if (!order) {
    sortBy.value = "nickname"
    sortOrder.value = "asc"
  } else {
    sortBy.value = prop as typeof sortBy.value
    sortOrder.value = order === "ascending" ? "asc" : "desc"
  }
  applyFilter()
}

function selectAllFiltered() {
  selectionMode.value = "filter"
  selectionFilter.value = normalizedFilter()
  excludedUserIds.value = []
  selectionMatchedCount.value = total.value
  restorePageSelection()
}

function formatTime(timestamp?: number) {
  if (!timestamp) return "-"
  return new Date(timestamp * 1000).toLocaleString("zh-CN", { hour12: false })
}

function actionLabel(operation: AuthorizationOperation) {
  return operation === "grant" ? "授权" : "取消授权"
}

function errorMessage(code?: string, fallback?: string) {
  const messages: Record<string, string> = {
    USER_DISABLED: "账号已停用，不建议直接重试",
    USER_NOT_FOUND: "人员不存在",
    SELF_REVOKE_NOT_ALLOWED: "不允许取消当前操作者的权限",
    RESOURCE_OWNER_REVOKE_NOT_ALLOWED: "不允许取消资源所有者的权限",
    NO_DIRECT_GRANT: "没有可移除的直接授权",
    NO_EXPLICIT_DENY: "没有可清除的个人拒绝",
    SYSTEM_RETRY_EXHAUSTED: "系统自动重试已耗尽，可人工重试"
  }
  return code && messages[code] ? messages[code] : fallback || code || "操作失败"
}

async function confirmExplicitAction(operation: AuthorizationOperation, rows: AuthorizationUserItem[]) {
  const eligible = rows.filter(row => operation === "grant" ? row.canGrant : row.canRevoke)
  if (!eligible.length) {
    ElMessage.warning(`当前选择中没有可${actionLabel(operation)}的人员`)
    return
  }
  if (eligible.length > 500) {
    ElMessage.warning("明确选择单次最多操作 500 人，请缩小范围或选择全部筛选结果")
    return
  }
  const inheritedCount = operation !== "grant"
    ? eligible.filter(row => !row.directAuthorized && row.authorizationSources.length > 0).length
    : 0
  const warning = inheritedCount
    ? `其中 ${inheritedCount} 人具有继承权限，取消后可能建立个人拒绝以确保无法访问。`
    : ""
  try {
    await ElMessageBox.confirm(
      `确认${actionLabel(operation)} ${eligible.length} 人？${warning}`,
      `${actionLabel(operation)}确认`,
      { type: operation === "grant" ? "info" : "warning", confirmButtonText: `确认${actionLabel(operation)}`, cancelButtonText: "取消" }
    )
  } catch {
    return
  }
  actionLoading.value = true
  try {
    const userIds = eligible.map(item => item.userId)
    const actualOperation = rows.length === 1 && operation !== "grant"
      ? eligible[0]?.revokeMode || "revoke_effective_access"
      : operation
    const res = await executeAuthorizationAction(props.documentId, {
      operation: actualOperation,
      userIds,
      idempotencyKey: createIdempotencyKey()
    })
    actionResult.value = res.data
    resultVisible.value = true
    clearSelection()
    await fetchList()
  } finally {
    actionLoading.value = false
  }
}

async function beginFilterAction(operation: AuthorizationOperation) {
  if (selectionMode.value !== "filter" || !selectionFilter.value) return
  actionLoading.value = true
  try {
    const res = await createAuthorizationPreview(props.documentId, {
      operation,
      filter: selectionFilter.value,
      excludedUserIds: excludedUserIds.value
    })
    preview.value = res.data
    previewOperation.value = operation
    previewVisible.value = true
  } finally {
    actionLoading.value = false
  }
}

async function confirmPreview() {
  if (!preview.value) return
  if (preview.value.expiresAt <= Math.floor(Date.now() / 1000)) {
    ElMessage.warning("操作预览已过期，请重新预览")
    previewVisible.value = false
    await beginFilterAction(previewOperation.value)
    return
  }
  actionLoading.value = true
  try {
    const res = await createAuthorizationOperation(props.documentId, {
      previewToken: preview.value.previewToken,
      expectedRevision: preview.value.authorizationRevision,
      idempotencyKey: createIdempotencyKey()
    })
    activeTask.value = res.data
    previewVisible.value = false
    schedulePoll(0)
  } catch {
    previewVisible.value = false
    await fetchList()
    ElMessage.warning("授权状态可能已变化，请重新预览后确认")
  } finally {
    actionLoading.value = false
  }
}

function schedulePoll(delay?: number) {
  stopPolling()
  pollingTimer = setTimeout(pollTask, delay ?? pollingDelay())
}

function pollingDelay() {
  if (document.hidden) return 7500
  return activeTask.value?.status === "queued" ? 2500 : 1500
}

function stopPolling() {
  if (pollingTimer) clearTimeout(pollingTimer)
  pollingTimer = null
}

async function pollTask() {
  if (!activeTask.value || !props.active) return
  try {
    const res = await getAuthorizationOperation(props.documentId, activeTask.value.operationId)
    activeTask.value = res.data
    if (terminalStatuses.has(res.data.status)) {
      stopPolling()
      clearSelection()
      await fetchList()
      if (res.data.failed > 0) await loadFailedItems()
      if (res.data.status === "conflict") ElMessage.warning("授权状态已变化，请重新选择并预览")
    }
  } finally {
    if (activeTask.value && !terminalStatuses.has(activeTask.value.status)) schedulePoll()
  }
}

async function loadFailedItems(pageNumber = 1) {
  if (!activeTask.value) return
  detailLoading.value = true
  detailPage.value = pageNumber
  try {
    const res = await getAuthorizationOperationItems(props.documentId, activeTask.value.operationId, {
      status: "failed",
      page: pageNumber,
      pageSize: 50
    })
    detailItems.value = res.data.list
    detailTotal.value = res.data.total
    resultVisible.value = true
  } finally {
    detailLoading.value = false
  }
}

async function retryFailures() {
  if (!activeTask.value) return
  actionLoading.value = true
  try {
    await fetchList()
    const res = await retryAuthorizationOperation(props.documentId, activeTask.value.operationId, {
      expectedRevision: authorizationRevision.value,
      idempotencyKey: createIdempotencyKey()
    })
    activeTask.value = res.data
    resultVisible.value = false
    schedulePoll(0)
  } finally {
    actionLoading.value = false
  }
}

watch(() => [props.active, props.documentId], ([active]) => {
  if (active) {
    page.value = 1
    clearSelection()
    fetchList()
  } else {
    stopPolling()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  stopPolling()
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="authorization-workspace">
    <div class="summary-tabs">
      <button :class="{ active: !filter.authorizationStatus }" @click="setStatus()">
        全部人员 <span>{{ facets.all }}</span>
      </button>
      <button :class="{ active: filter.authorizationStatus === 'authorized' }" @click="setStatus('authorized')">
        已授权 <span>{{ facets.authorized }}</span>
      </button>
      <button :class="{ active: filter.authorizationStatus === 'unauthorized' }" @click="setStatus('unauthorized')">
        未授权 <span>{{ facets.unauthorized }}</span>
      </button>
    </div>

    <div class="filter-area">
      <el-input v-model="filter.keyword" clearable placeholder="搜索昵称或账号" class="keyword" @input="handleKeywordInput" @keyup.enter="applyFilter">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="filter.categoryIds" multiple collapse-tags clearable placeholder="人员分类" @change="applyFilter">
        <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filter.accountStatus" clearable placeholder="账号状态" @change="applyFilter">
        <el-option label="正常" value="active" />
        <el-option label="停用" value="disabled" />
      </el-select>
      <el-input v-model="classIdsText" placeholder="班级 ID，逗号分隔" clearable @change="applyFilter" />
      <el-input v-model="groupIdsText" placeholder="小组 ID，逗号分隔" clearable @change="applyFilter" />
      <el-button @click="resetFilter">
        <el-icon><RefreshLeft /></el-icon>重置
      </el-button>
    </div>

    <div v-if="selectedCount" class="selection-bar">
      <div>
        已选择 <strong>{{ selectedCount }}</strong> 人
        <span v-if="selectionMode === 'filter'">（全部筛选结果，已排除 {{ excludedUserIds.length }} 人）</span>
      </div>
      <div class="selection-actions">
        <el-button v-if="selectionMode === 'explicit' && currentPageFullySelected && total > list.length" link type="primary" @click="selectAllFiltered">
          选择全部 {{ total }} 人
        </el-button>
        <template v-if="selectionMode === 'explicit'">
          <el-button type="primary" :disabled="!selectedGrantCount" :loading="actionLoading" @click="confirmExplicitAction('grant', selectedRows)">
            授权可操作的 {{ selectedGrantCount }} 人
          </el-button>
          <el-button type="danger" plain :disabled="!selectedRevokeCount" :loading="actionLoading" @click="confirmExplicitAction('revoke_effective_access', selectedRows)">
            取消可操作的 {{ selectedRevokeCount }} 人
          </el-button>
        </template>
        <template v-else>
          <el-button type="primary" :loading="actionLoading" @click="beginFilterAction('grant')">
            批量授权
          </el-button>
          <el-button type="danger" plain :loading="actionLoading" @click="beginFilterAction('revoke_effective_access')">
            批量取消授权
          </el-button>
        </template>
        <el-button link @click="clearSelection">
          清空选择
        </el-button>
      </div>
    </div>

    <div v-if="activeTask" class="task-panel">
      <div class="task-title">
        <span>{{ actionLabel(activeTask.operation) }}任务：{{ activeTask.status }}</span>
        <span>{{ activeTask.processed }}/{{ activeTask.total }}</span>
      </div>
      <el-progress :percentage="taskPercentage" />
      <div class="task-counts">
        成功 {{ activeTask.succeeded }} · 跳过 {{ activeTask.skipped }} · 失败 {{ activeTask.failed }}
        <el-button v-if="activeTask.failed && terminalStatuses.has(activeTask.status)" link type="danger" @click="loadFailedItems()">
          查看失败项
        </el-button>
      </div>
    </div>

    <el-alert v-if="loadError" type="error" title="人员列表加载失败" show-icon :closable="false">
      <template #default>
        <el-button link type="primary" @click="fetchList">
          重新加载
        </el-button>
      </template>
    </el-alert>

    <el-table ref="tableRef" v-loading="loading" :data="list" row-key="userId" height="480" @selection-change="handleSelectionChange" @sort-change="handleSortChange">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="nickname" label="姓名/昵称" min-width="150" sortable="custom">
        <template #default="{ row }">
          <div class="person-cell">
            <el-avatar :size="30" :src="row.avatar">
              {{ row.nickname?.slice(0, 1) }}
            </el-avatar>
            <span>{{ row.nickname || "-" }}</span>
            <el-tag v-if="row.accountStatus === 'disabled'" size="small" type="info">
              停用
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="account" label="账号" min-width="140" sortable="custom" />
      <el-table-column label="身份/组织" min-width="220">
        <template #default="{ row }">
          <div class="tag-list">
            <el-tag v-for="identity in row.identities" :key="identity.code" size="small">
              {{ identity.name }}
            </el-tag>
            <el-tag v-for="organization in row.organizations" :key="`${organization.type}-${organization.id}`" size="small" type="info">
              {{ organization.name }}
            </el-tag>
            <span v-if="!row.identities.length && !row.organizations.length">-</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="授权状态" min-width="190" sortable="custom" prop="authorizedAt">
        <template #default="{ row }">
          <div class="authorization-state">
            <el-tag :type="row.effectiveAuthorized ? 'success' : 'info'">
              {{ row.effectiveAuthorized ? "已授权" : "未授权" }}
            </el-tag>
            <el-tag v-if="row.directAuthorized" size="small">
              直接授权
            </el-tag>
            <el-tag v-if="row.explicitlyDenied" size="small" type="danger">
              个人拒绝
            </el-tag>
            <el-tooltip v-if="row.authorizationSources.length" placement="top">
              <template #content>
                <div v-for="source in row.authorizationSources" :key="`${source.type}-${source.id}`">
                  {{ source.name }} · {{ source.operatorName || "-" }}
                </div>
              </template>
              <span class="source-link">来源 {{ row.authorizationSources.length }} 项</span>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="授权信息" min-width="155">
        <template #default="{ row }">
          <div class="meta">
            {{ row.authorizedByName || "-" }}
          </div>
          <div class="meta">
            {{ formatTime(row.authorizedAt) }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="105" fixed="right">
        <template #default="{ row }">
          <el-tooltip :disabled="row.effectiveAuthorized ? row.canRevoke : row.canGrant" :content="row.operationDisabledReason || '当前人员不可执行此操作'">
            <span>
              <el-button v-if="row.effectiveAuthorized" link type="danger" :disabled="!row.canRevoke" :loading="actionLoading" @click="confirmExplicitAction('revoke_effective_access', [row])">取消授权</el-button>
              <el-button v-else link type="primary" :disabled="!row.canGrant" :loading="actionLoading" @click="confirmExplicitAction('grant', [row])">授权</el-button>
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有符合条件的人员">
          <el-button type="primary" link @click="resetFilter">
            清除筛选
          </el-button>
        </el-empty>
      </template>
    </el-table>

    <div class="pagination">
      <span>共 {{ total }} 条</span>
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[20, 50, 100]" :total="total" layout="sizes, prev, pager, next" background @current-change="fetchList" @size-change="() => { page = 1; fetchList() }" />
    </div>

    <el-dialog v-model="previewVisible" title="确认批量操作" width="480px" append-to-body>
      <template v-if="preview">
        <p>筛选条件匹配 <strong>{{ preview.matchedCount }}</strong> 人</p>
        <p>预计实际{{ actionLabel(previewOperation) }} <strong>{{ preview.effectiveCount }}</strong> 人</p>
        <p>另外 {{ preview.matchedCount - preview.effectiveCount }} 人会因当前状态被跳过。</p>
        <el-alert v-if="previewOperation !== 'grant'" type="warning" :closable="false" title="取消后将确保人员无法访问；继承权限可能通过个人拒绝被阻止。" />
      </template>
      <template #footer>
        <el-button @click="previewVisible = false">
          取消
        </el-button>
        <el-button :type="previewOperation === 'grant' ? 'primary' : 'danger'" :loading="actionLoading" @click="confirmPreview">
          确认{{ actionLabel(previewOperation) }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resultVisible" title="操作结果" width="620px" append-to-body>
      <div v-if="actionResult" class="result-summary">
        请求 {{ actionResult.summary.requested }} 人，成功 {{ actionResult.summary.succeeded }} 人，跳过 {{ actionResult.summary.skipped }} 人，失败 {{ actionResult.summary.failed }} 人
      </div>
      <el-table v-if="actionResult?.items.length" :data="actionResult.items.filter(item => item.status === 'failed')" max-height="320">
        <el-table-column prop="userId" label="人员 ID" width="110" />
        <el-table-column label="失败原因">
          <template #default="{ row }">
            {{ errorMessage(row.code, row.message) }}
          </template>
        </el-table-column>
      </el-table>
      <el-table v-else v-loading="detailLoading" :data="detailItems" max-height="320">
        <el-table-column prop="userId" label="人员 ID" width="110" />
        <el-table-column label="失败原因">
          <template #default="{ row }">
            {{ errorMessage(row.code, row.message) }}
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="detailTotal > 50" v-model:current-page="detailPage" :page-size="50" :total="detailTotal" layout="prev, pager, next" @current-change="loadFailedItems" />
      <template #footer>
        <el-button v-if="activeTask?.failed" :loading="actionLoading" @click="retryFailures">
          重试失败项
        </el-button>
        <el-button type="primary" @click="resultVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.authorization-workspace {
  min-height: 620px;
}
.summary-tabs {
  display: flex;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 16px;
  gap: 28px;
}
.summary-tabs button {
  padding: 0 4px 12px;
  border: 0;
  background: transparent;
  color: #606266;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.summary-tabs button.active {
  color: #409eff;
  border-bottom-color: #409eff;
}
.summary-tabs span {
  margin-left: 4px;
  color: #909399;
}
.filter-area {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(4, minmax(130px, 1fr)) auto;
  gap: 10px;
  margin-bottom: 14px;
}
.selection-bar,
.task-panel {
  border: 1px solid #c6e2ff;
  background: #ecf5ff;
  border-radius: 4px;
  padding: 10px 14px;
  margin-bottom: 12px;
}
.selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.selection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.task-title,
.task-counts {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #606266;
}
.task-counts {
  margin: 6px 0 0;
  font-size: 13px;
}
.person-cell,
.tag-list,
.authorization-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.authorization-state {
  align-items: flex-start;
}
.source-link {
  color: #409eff;
  cursor: help;
  font-size: 12px;
}
.meta {
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  color: #909399;
}
.result-summary {
  margin-bottom: 14px;
}
@media (max-width: 1200px) {
  .filter-area {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
