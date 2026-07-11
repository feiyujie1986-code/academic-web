<script lang="ts" setup>
import type { FeeCategoryItem } from "@/api/activity/feeCategory"
import { formatMoney, yuanToFen } from "@@/utils/money"
import {
  createFeeCategoryApi,
  deleteFeeCategoryApi,
  editFeeCategoryApi,
  getFeeCategoriesApi
} from "@/api/activity/feeCategory"

const props = defineProps<{ activityId: number }>()

// ========== 列表数据 ==========
const loading = ref(false)
const tableData = ref<FeeCategoryItem[]>([])

async function getTableData() {
  loading.value = true
  try {
    const res = await getFeeCategoriesApi(props.activityId)
    if (res.code === 0) {
      tableData.value = res.data.list
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

watch(() => props.activityId, (id) => {
  if (id) getTableData()
}, { immediate: true })

// ========== 行内新增 ==========
interface EditRow {
  id: number // 0 表示新增未保存
  name: string
  priceYuan: number
  sortOrder: number
  saving: boolean
}

const addingRow = ref<EditRow | null>(null)

function handleAdd() {
  addingRow.value = { id: 0, name: "", priceYuan: 0, sortOrder: tableData.value.length + 1, saving: false }
}

function cancelAdd() {
  addingRow.value = null
}

async function confirmAdd() {
  if (!addingRow.value) return
  if (!addingRow.value.name.trim()) {
    ElMessage.warning("请输入类别名称")
    return
  }
  addingRow.value.saving = true
  try {
    const res = await createFeeCategoryApi(props.activityId, {
      name: addingRow.value.name.trim(),
      price: yuanToFen(addingRow.value.priceYuan),
      sortOrder: addingRow.value.sortOrder
    })
    if (res.code === 0) {
      ElMessage.success("添加成功")
      addingRow.value = null
      getTableData()
    }
  } catch (error) {
    console.error(error)
  } finally {
    if (addingRow.value) addingRow.value.saving = false
  }
}

// ========== 行内编辑 ==========
const editingId = ref<number | null>(null)
const editBuffer = ref<{ name: string, priceYuan: number, sortOrder: number }>({ name: "", priceYuan: 0, sortOrder: 0 })
const savingId = ref<number | null>(null)

function startEdit(row: FeeCategoryItem) {
  editingId.value = row.id
  editBuffer.value = { name: row.name, priceYuan: Number(formatMoney(row.price)), sortOrder: row.sortOrder }
}

function cancelEdit() {
  editingId.value = null
}

async function confirmEdit(row: FeeCategoryItem) {
  if (!editBuffer.value.name.trim()) {
    ElMessage.warning("请输入类别名称")
    return
  }
  savingId.value = row.id
  try {
    const res = await editFeeCategoryApi(props.activityId, row.id, {
      name: editBuffer.value.name.trim(),
      price: yuanToFen(editBuffer.value.priceYuan),
      sortOrder: editBuffer.value.sortOrder
    })
    if (res.code === 0) {
      ElMessage.success("保存成功")
      editingId.value = null
      getTableData()
    }
  } catch (error) {
    console.error(error)
  } finally {
    savingId.value = null
  }
}

// ========== 删除 ==========
const deleteLoading = ref<number | null>(null)

async function handleDelete(row: FeeCategoryItem) {
  try {
    await ElMessageBox.confirm(`确认删除收费类别「${row.name}」？`, "确认删除", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })
    deleteLoading.value = row.id
    const res = await deleteFeeCategoryApi(props.activityId, row.id)
    if (res.code === 0) {
      ElMessage.success("删除成功")
      getTableData()
    }
  } catch (error) {
    if (error !== "cancel") console.error(error)
  } finally {
    deleteLoading.value = null
  }
}

function hasCategories(): boolean {
  return tableData.value.length > 0
}

defineExpose({ hasCategories })
</script>

<template>
  <div v-loading="loading" class="fee-category-table">
    <el-table :data="tableData" size="small" border>
      <el-table-column label="名称" min-width="140">
        <template #default="{ row }">
          <el-input v-if="editingId === row.id" v-model="editBuffer.name" size="small" maxlength="30" />
          <span v-else>{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="单价(元)" width="120">
        <template #default="{ row }">
          <el-input-number
            v-if="editingId === row.id"
            v-model="editBuffer.priceYuan"
            size="small"
            :min="0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
          />
          <span v-else>{{ formatMoney(row.price) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="排序" width="90">
        <template #default="{ row }">
          <el-input-number
            v-if="editingId === row.id"
            v-model="editBuffer.sortOrder"
            size="small"
            :min="0"
            controls-position="right"
            style="width: 100%"
          />
          <span v-else>{{ row.sortOrder }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" align="center">
        <template #default="{ row }">
          <template v-if="editingId === row.id">
            <el-button type="primary" link :loading="savingId === row.id" @click="confirmEdit(row)">
              保存
            </el-button>
            <el-button link @click="cancelEdit">
              取消
            </el-button>
          </template>
          <template v-else>
            <el-button type="primary" link @click="startEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link :loading="deleteLoading === row.id" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增行 -->
    <div v-if="addingRow" class="add-row">
      <el-input v-model="addingRow.name" placeholder="类别名称" size="small" maxlength="30" style="width: 140px" />
      <el-input-number v-model="addingRow.priceYuan" placeholder="单价(元)" size="small" :min="0" :precision="2" controls-position="right" style="width: 120px" />
      <el-input-number v-model="addingRow.sortOrder" placeholder="排序" size="small" :min="0" controls-position="right" style="width: 90px" />
      <el-button type="primary" link :loading="addingRow.saving" @click="confirmAdd">
        保存
      </el-button>
      <el-button link @click="cancelAdd">
        取消
      </el-button>
    </div>

    <el-button v-else type="primary" link class="add-btn" @click="handleAdd">
      + 添加类别
    </el-button>
  </div>
</template>

<style lang="scss" scoped>
.fee-category-table {
  width: 100%;
}

.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.add-btn {
  margin-top: 8px;
}
</style>
