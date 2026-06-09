<script lang="ts" setup>
import type { RegistrationItem } from "@/api/activity/activity"
import { usePagination } from "@@/composables/usePagination_n"
import { formatDateTime } from "@@/utils/datetime"
import { getActivityRegistrationsApi, removeRegistrationApi } from "@/api/activity/activity"

interface Props {
  visible: boolean
  activityId: number | null
  activityTitle: string
  maxParticipants: number
  registeredCount: number
}

interface Emits {
  (e: "update:visible", value: boolean): void
  (e: "changed"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
})

const capacityText = computed(() => {
  const max = props.maxParticipants === 0 ? "不限" : String(props.maxParticipants)
  return `已报名 ${props.registeredCount}/${max} 人`
})

// ========== 表格数据 ==========
const { paginationData, changeCurrentPage, changePageSize } = usePagination()
const loading = ref(false)
const tableData = ref<RegistrationItem[]>([])

async function getTableData() {
  if (!props.activityId) return
  loading.value = true
  try {
    const res = await getActivityRegistrationsApi(props.activityId, {
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

watch(() => props.visible, (visible) => {
  if (visible) {
    paginationData.currentPage = 1
    getTableData()
  }
})

function handleSizeChange(value: number) {
  changePageSize(value)
  getTableData()
}

function handleCurrentChange(value: number) {
  changeCurrentPage(value)
  getTableData()
}

// ========== 移除报名 ==========
const removeLoading = ref<number | null>(null)

async function handleRemove(row: RegistrationItem) {
  if (!props.activityId) return
  try {
    await ElMessageBox.confirm(`确认将「${row.nickname}」从报名名单中移除？`, "确认移除", {
      confirmButtonText: "确认移除",
      cancelButtonText: "取消",
      type: "warning"
    })
    removeLoading.value = row.userId
    const res = await removeRegistrationApi(props.activityId, row.userId)
    if (res.code === 0) {
      ElMessage.success("已移除")
      getTableData()
      emit("changed")
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    removeLoading.value = null
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`《${activityTitle}》报名人员`"
    width="700px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="dialog-header-info">
      {{ capacityText }}
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe>
      <el-table-column label="用户" min-width="180">
        <template #default="{ row }">
          <div class="user-cell">
            <el-avatar :src="row.avatar" :size="32" />
            <span class="user-name">{{ row.nickname || `用户 ${row.userId}` }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="报名时间" width="180" align="center">
        <template #default="{ row }">
          {{ formatDateTime(row.registeredAt * 1000) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center">
        <template #default="{ row }">
          <el-button
            type="danger"
            link
            :loading="removeLoading === row.userId"
            @click="handleRemove(row)"
          >
            移除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无报名记录" />

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
  </el-dialog>
</template>

<style lang="scss" scoped>
.dialog-header-info {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-size: 14px;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
