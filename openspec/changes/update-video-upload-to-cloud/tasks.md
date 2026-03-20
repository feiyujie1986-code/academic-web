# Tasks: 课程模板录播视频上传改用云存储直传

## 1. 修改 ChunkVideoUpload 组件

- [x] 1.1 替换 import：`useChunkUpload` → `useCloudUpload`
- [x] 1.2 替换类型 import：`UploadStatus` 从 `@/composables/useChunkUpload` 改为 `@/composables/useCloudUpload`
- [x] 1.3 适配 composable 调用：
  - `start(file)` → `upload(file)`
  - `statusText` 需要自行实现（新 composable 不提供）
- [x] 1.4 适配状态映射：
  - 新增 `initializing` 状态对应 "初始化中..."
  - 新增 `completing` 状态对应 "完成中..."
  - `success` → `completed`
- [x] 1.5 适配返回结果：
  - `result.file` → `result` (直接是 UploadFileInfo)
  - 字段映射：`filename`, `size`, `fullpath`, `md5` 保持一致
- [x] 1.6 确保 `cancel()` 方法正确清理云端已上传分片

## 2. 验证

- [ ] 2.1 验证小文件上传（<5MB）- 走直传流程
- [ ] 2.2 验证大文件上传（≥5MB）- 走分片直传流程
- [ ] 2.3 验证秒传功能
- [ ] 2.4 验证暂停/继续功能（大文件）
- [ ] 2.5 验证取消上传功能
- [ ] 2.6 验证进度显示准确性
- [ ] 2.7 验证上传完成后保存课节正常