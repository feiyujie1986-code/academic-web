# class-management Specification

## Purpose

TBD - created by archiving change refactor-class-student-selection. Update Purpose after archive.

## Requirements

### Requirement: Server-side Student Filtering

SelectUserModal 组件 SHALL 支持服务端分页和筛选模式，通过 API 获取学生列表而非接收全量数据。

#### Scenario: 按机构筛选学生

- **WHEN** 用户在班级详情页点击「新增学生」且班级关联了机构
- **THEN** SelectUserModal 调用 `/v2/admin/students/list` 接口并传递 `organizationId` 参数
- **AND** 仅显示该机构下的学生

#### Scenario: 获取全部学生

- **WHEN** 用户在班级详情页点击「新增学生」且班级未关联机构
- **THEN** SelectUserModal 调用 `/v2/admin/students/list` 接口不传递 `organizationId`
- **AND** 显示系统中所有学生

### Requirement: Server-side Search

SelectUserModal 组件 SHALL 支持服务端搜索，搜索请求发送到后端处理。

#### Scenario: 搜索学生

- **WHEN** 用户在选人弹窗中输入关键词并点击搜索
- **THEN** 系统调用 API 并传递 `keyword` 参数进行服务端搜索
- **AND** 重置分页到第一页
- **AND** 显示匹配的学生列表

### Requirement: Pagination Support

SelectUserModal 组件 SHALL 支持分页加载学生列表。

#### Scenario: 分页切换

- **WHEN** 用户点击分页器切换页码
- **THEN** 系统调用 API 获取对应页的数据
- **AND** 保留当前搜索条件和 organizationId 筛选条件
