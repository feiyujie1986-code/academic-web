# Change: 重构班级学生选择逻辑 - 服务端筛选

## Why

当前班级添加学生功能使用 `pageSize: 999999` 一次性获取所有学生数据，然后在前端本地进行搜索过滤。当学生数量增大时，会导致：

- 首次加载慢（需等待全量数据返回）
- 内存占用高（全量数据存储在前端）
- 搜索体验差（仅支持 nickname 本地匹配）

**涉及两个入口：**

1. 新增班级页面 (`src/pages/class/add/index.vue`) - 选择学生
2. 班级详情页面 (`src/pages/class/detail/components/ClassStudentTab.vue`) - 新增学生

## What Changes

- 将 `SelectUserModal` 组件改为服务端分页/搜索模式
- 移除 `pageSize: 999999` 的全量拉取方式
- 启用组件内已有的 `loadUserList()` 方法调用后端 API
- `organizationId` 筛选完全由服务端处理，前端不再传入全量 userList

## Impact

- Affected specs: class-management (新建)
- Affected code:
  - `src/pages/class/components/SelectUserModal.vue` - 启用服务端分页模式
  - `src/pages/class/add/index.vue` - 移除预加载学生逻辑，改为传递 organizationId
  - `src/pages/class/detail/components/ClassStudentTab.vue` - 移除预加载逻辑，改为传递 organizationId
  - `src/api/member/student.ts` - 可能需要调整接口参数
