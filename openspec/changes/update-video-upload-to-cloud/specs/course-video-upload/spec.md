# Course Video Upload (课程模板录播视频上传)

## MODIFIED Requirements

### Requirement: Video Upload Uses Cloud Direct Upload

课程模板排课中的录播视频上传 SHALL 使用云存储直传方案（`useCloudUpload`），而非服务器中转方案。

系统 SHALL 根据文件大小自动选择上传方式：
- 小于 5MB：直传（PUT 请求到预签名 URL）
- 大于等于 5MB：Multipart 分片直传

#### Scenario: 小文件直传上传

- **GIVEN** 用户在课程模板排课中新增录播视频课节
- **WHEN** 用户选择一个小于 5MB 的视频文件
- **THEN** 系统使用直传方式上传
- **AND** 上传进度实时显示（0-100%）
- **AND** 上传完成后视频信息正确绑定到表单

#### Scenario: 大文件分片直传上传

- **GIVEN** 用户在课程模板排课中新增录播视频课节
- **WHEN** 用户选择一个大于等于 5MB 的视频文件
- **THEN** 系统使用 Multipart 分片直传方式上传
- **AND** 支持暂停和继续上传
- **AND** 上传进度实时显示（包含分片内进度）
- **AND** 上传完成后视频信息正确绑定到表单

#### Scenario: 秒传功能

- **GIVEN** 服务端已存在相同 MD5 的文件
- **WHEN** 用户上传该文件
- **THEN** 系统检测到秒传条件
- **AND** 直接返回已有文件信息
- **AND** 进度直接跳到 100%

#### Scenario: 上传取消

- **GIVEN** 用户正在上传视频
- **WHEN** 用户点击取消按钮
- **THEN** 上传立即停止
- **AND** 如果是分片上传，通知服务端取消并清理已上传分片
- **AND** 组件状态重置为初始状态

#### Scenario: 编辑已有录播视频课节

- **GIVEN** 用户编辑一个已有录播视频的课节
- **WHEN** 打开编辑对话框
- **THEN** 显示已上传的视频文件信息
- **AND** 用户可以选择重新上传替换视频