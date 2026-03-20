# Tasks: 重构班级学生选择逻辑

## 1. 修改 SelectUserModal 组件
- [x] 1.1 新增 `organizationId` prop，用于服务端筛选
- [x] 1.2 新增 `useServerPagination` prop，控制是否使用服务端分页模式
- [x] 1.3 启用 `loadUserList()` 方法，在弹窗打开时调用 API 获取数据
- [x] 1.4 修改 `handleSearch()` 方法，改为调用 API 而非本地过滤
- [x] 1.5 启用分页组件，支持 `handlePageChange()` 切换页面

## 2. 修改 ClassStudentTab 组件（班级详情-新增学生）
- [x] 2.1 移除 `handleAddStudent()` 中预先获取全量学生的逻辑
- [x] 2.2 改为仅传递 `organizationId` 给 SelectUserModal
- [x] 2.3 由 SelectUserModal 内部负责调用 API 获取学生列表

## 3. 修改 ClassAdd 组件（新增班级-选择学生）
- [x] 3.1 移除页面加载时预获取全部学生 `getStudentOption()` 的逻辑
- [x] 3.2 移除 `openSelect('student')` 中按 organizationId 重新请求的逻辑
- [x] 3.3 改为传递 `formData.organizationId` 给 SelectUserModal
- [x] 3.4 由 SelectUserModal 内部负责调用 API 获取学生列表

## 4. 验证与测试
- [ ] 4.1 新增班级：验证有 organizationId 时按机构筛选学生正常
- [ ] 4.2 新增班级：验证无 organizationId 时获取全部学生正常
- [ ] 4.3 班级详情：验证有 organizationId 时按机构筛选学生正常
- [ ] 4.4 班级详情：验证无 organizationId 时获取全部学生正常
- [ ] 4.5 验证搜索功能正常（服务端搜索）
- [ ] 4.6 验证分页功能正常
- [ ] 4.7 验证选择学生并绑定班级功能正常