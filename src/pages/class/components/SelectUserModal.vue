<script lang="ts">
import { ElMessage, ElMessageBox } from "element-plus"
import { defineComponent, ref, watch } from "vue"

export default defineComponent({
  name: "SelectUserModal",
  props: {
    // 是否显示弹窗
    modelValue: {
      type: Boolean,
      default: false
    },
    // 弹窗标题
    title: {
      type: String,
      default: "选择人员"
    },
    // 用户类型（teacher/student/seniorTeacher/classMonitor）
    userType: {
      type: String,
      required: true
    },
    // 是否显示批量导入按钮
    showBatchImport: {
      type: Boolean,
      default: false
    },
    // 最小选择人数限制
    minSelectCount: {
      type: Number,
      default: 1
    },
    // 最大选择人数限制
    maxSelectCount: {
      type: Number,
      default: 999
    },
    // 已选择用户id
    selectedUserIds: {
      type: Array,
      default: () => []
    },
    // 全部用户列表（本地模式使用）
    userList: {
      type: Array,
      default: () => []
    },
    // 是否使用服务端分页模式
    useServerPagination: {
      type: Boolean,
      default: false
    },
    // 机构ID，用于服务端筛选（仅服务端模式有效）
    organizationId: {
      type: Number,
      default: undefined
    }
  },
  emits: [
    "update:modelValue",
    "confirm",
    "cancel"
  ],
  setup(props, { emit }) {
    // 弹窗控制
    const visible = ref(false)

    // 搜索关键词
    const searchKeyword = ref("")

    // 分页参数
    const currentPage = ref(1)
    const pageSize = ref(10)

    // 用户数据
    const allUsers = ref<any[]>([])
    const userList = ref<any[]>([])
    const total = ref(0)

    // 已选用户ID
    const selectedIds = ref<number[]>([])

    // 已选用户详情
    const selectedUsers = computed(() => {
      return allUsers.value.filter(item => selectedIds.value.includes(item.id))
    })

    // 已选人数
    const selectedCount = computed(() => selectedIds.value.length)

    // 加载状态
    const loading = ref(false)

    // 监听modelValue变化
    watch(() => props.modelValue, (val) => {
      visible.value = val
      if (val) {
        selectedIds.value = props.selectedUserIds as number[]
        if (props.useServerPagination) {
          // 服务端分页模式：调用API获取数据
          loadUserList()
        } else {
          // 本地模式：使用外部传入的数据
          allUsers.value = props.userList as any[]
          userList.value = props.userList as any[]
          total.value = userList.value.length
        }
      }
    })

    // 加载用户列表（服务端模式）
    async function loadUserList() {
      if (!props.useServerPagination) return

      loading.value = true
      try {
        const params: any = {
          page: currentPage.value,
          pageSize: pageSize.value
        }

        // 添加搜索关键词
        if (searchKeyword.value) {
          params.nickname = searchKeyword.value
        }

        // 添加机构ID筛选
        if (props.organizationId) {
          params.organizationId = props.organizationId
        }

        let apiCall
        switch (props.userType) {
          case "teacher":
            apiCall = await import("@/api/member/teacher").then(mod => mod.getTeachersApi(params))
            break
          case "student":
          case "classMonitor":
            apiCall = await import("@/api/member/student").then(mod => mod.getStudentsApi(params))
            break
          case "seniorTeacher":
            apiCall = await import("@/api/member/seniorTeacher").then(mod => mod.getTeachersApi(params))
            break
          default:
            throw new Error("不支持的用户类型")
        }

        if (apiCall.code === 0) {
          userList.value = apiCall.data.list
          total.value = apiCall.data.total
          // 服务端模式下，将获取到的用户合并到 allUsers 中（用于已选用户显示）
          const newUsers = apiCall.data.list.filter(
            (user: any) => !allUsers.value.some(u => u.id === user.id)
          )
          allUsers.value = [...allUsers.value, ...newUsers]
        } else {
          ElMessage.error(apiCall.msg)
        }
      } catch (error) {
        ElMessage.error("加载用户失败")
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    // 搜索处理
    function handleSearch() {
      if (props.useServerPagination) {
        // 服务端模式：调用API搜索
        currentPage.value = 1
        loadUserList()
      } else {
        // 本地模式：本地过滤
        if (searchKeyword.value === "") {
          userList.value = allUsers.value
          total.value = userList.value.length
          return
        }
        userList.value = allUsers.value.filter(item => item.nickname.includes(searchKeyword.value))
        total.value = userList.value.length
      }
    }

    // 分页切换
    function handlePageChange(page: number) {
      currentPage.value = page
      if (props.useServerPagination) {
        loadUserList()
      }
    }

    // 切换选择
    function toggleSelect(user: any) {
      console.log(`切换用户: ${user.nickname}, ID: ${user.id}`)
      console.log(`当前已选ID:`, selectedIds.value)

      const index = selectedIds.value.indexOf(user.id)

      if (index === -1) {
        selectedIds.value.push(user.id)
        console.log(`当前已选ID:`, selectedIds.value)
        console.log(`添加成功，现在有${selectedIds.value.length}个已选用户`)
      } else {
        selectedIds.value.splice(index, 1)
        console.log(`移除成功，现在有${selectedIds.value.length}个已选用户`)
      }
    }

    // 复选框变化处理
    function handleCheckboxChange(user: any) {
      toggleSelect(user)
    }

    // 移除已选
    function removeSelected(id: number) {
      const index = selectedIds.value.indexOf(id)
      if (index !== -1) {
        selectedIds.value.splice(index, 1)
      }
    }

    // 清空所有已选
    function clearAllSelected() {
      ElMessageBox.confirm("确定要清空所有已选人员吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }).then(() => {
        selectedIds.value = []
      })
    }

    // 批量导入处理
    function handleBatchImport() {
      ElMessage.info("批量导入功能暂未实现")
    }

    // 确认选择
    function confirmSelection() {
      if (selectedCount.value < props.minSelectCount) {
        ElMessage.warning(`至少需要选择${props.minSelectCount}个人员`)
        return
      }

      if (selectedCount.value > props.maxSelectCount) {
        ElMessage.warning(`最多只能选择${props.maxSelectCount}个人员`)
        return
      }

      // 同时发送选中的ID和用户数据（服务端模式需要用户数据）
      emit("confirm", selectedIds.value, selectedUsers.value)
      handleClose()
    }

    // 关闭弹窗
    function handleClose() {
      visible.value = false
      emit("update:modelValue", false)
      emit("cancel")
    }

    // 初始化
    watch(visible, (val) => {
      if (!val) {
        // 重置搜索条件
        searchKeyword.value = ""
        currentPage.value = 1
        selectedIds.value = []
      }
    })

    return {
      visible,
      searchKeyword,
      currentPage,
      pageSize,
      userList,
      total,
      selectedIds,
      selectedUsers,
      selectedCount,
      loading,
      handleSearch,
      handlePageChange,
      toggleSelect,
      handleCheckboxChange,
      removeSelected,
      clearAllSelected,
      handleBatchImport,
      confirmSelection,
      handleClose,
      loadUserList
    }
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="800px"
    @close="handleClose"
  >
    <div class="select-user-modal">
      <!-- 搜索区域 -->
      <div class="search-area">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入人员信息"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
          style="width: 250px;"
        />
        <el-button type="primary" size="small" @click="handleSearch">
          搜索
        </el-button>

        <!-- 批量导入按钮 -->
        <el-button
          type="primary"
          link
          icon="Upload"
          @click="handleBatchImport"
          v-if="showBatchImport"
        >
          批量导入
        </el-button>
      </div>

      <!-- 主要内容区域 -->
      <div class="content-area">
        <div class="user-list-container">
          <!-- 左侧用户列表 -->
          <div class="user-list-wrapper">
            <div class="list-header">
              <span>可选人员</span>
              <span>{{ total }} 条记录</span>
            </div>

            <div v-loading="loading" class="user-list">
              <div
                v-for="item in userList"
                :key="item.id"
                class="user-item"
                :class="{ selected: selectedIds.includes(item.id) }"
                @click="toggleSelect(item)"
              >
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(item.id)"
                >
                <div class="user-info">
                  <div class="user-name">
                    {{ item.nickname }}
                  </div>
                  <div class="user-email">
                    {{ item.email }}
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-if="userList.length === 0 && !loading" class="empty-state">
                <i class="el-icon-search" />
                <p>暂无数据</p>
              </div>
            </div>

            <!-- 分页（服务端模式启用） -->
            <div v-if="useServerPagination && total > pageSize" class="pagination">
              <el-pagination
                background
                layout="prev, pager, next"
                :total="total"
                :page-size="pageSize"
                :current-page="currentPage"
                @current-change="handlePageChange"
              />
            </div>
          </div>

          <!-- 右侧已选人员 -->
          <div class="selected-list-wrapper">
            <div class="list-header">
              <span>已选 {{ selectedCount }} 人</span>
              <el-button
                type="primary"
                link
                size="small"
                @click="clearAllSelected"
                v-if="selectedCount > 0"
              >
                全部移除
              </el-button>
            </div>

            <div class="selected-list">
              <div
                v-for="item in selectedUsers"
                :key="item.id"
                class="selected-item"
              >
                <span class="user-name">{{ item.nickname }}</span>
                <i class="el-icon-close" @click="removeSelected(item.id)" />
              </div>

              <!-- 空状态 -->
              <div v-if="selectedCount === 0" class="empty-state">
                <i class="el-icon-add" />
                <p>暂无选择</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <!-- <template #footer> -->
      <div class="dialog-footer">
        <el-button @click="handleClose">
          取消
        </el-button>
        <el-button type="primary" @click="confirmSelection">
          确认
        </el-button>
      </div>
      <!-- </template> -->
    </div>
  </el-dialog>
</template>

<style scoped>
.select-user-modal {
  padding: 20px;
}

.search-area {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}

.content-area {
  height: 500px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.user-list-container {
  display: flex;
  height: 100%;
}

.user-list-wrapper,
.selected-list-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #dcdfe6;
  padding: 10px;
}

.user-list-wrapper:last-child {
  border-right: none;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  color: #303133;
  flex-shrink: 0; /* 防止头部被压缩 */
}

.user-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  min-height: 0; /* 允许flex子项收缩 */
}

.user-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: all 0.2s;
}

.user-item:hover {
  background-color: #f5f7fa;
}

.user-item.selected {
  background-color: #e6f7ff;
}

.user-info {
  margin-left: 10px;
  flex: 1;
}

.user-name {
  font-size: 14px;
  color: #303133;
  margin-bottom: 2px;
}

.user-email {
  font-size: 12px;
  color: #909399;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.empty-state i {
  font-size: 40px;
  margin-bottom: 10px;
}

.pagination {
  margin-top: 10px;
  text-align: right;
}

.selected-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  min-height: 0; /* 允许flex子项收缩 */
}

.selected-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #eef2f7;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
}

.selected-item .user-name {
  margin-right: 10px;
}

.selected-item .el-icon-close {
  font-size: 14px;
  color: #909399;
  cursor: pointer;
}

.selected-item .el-icon-close:hover {
  color: #f56c6c;
}

.dialog-footer {
  text-align: right;
}
</style>
