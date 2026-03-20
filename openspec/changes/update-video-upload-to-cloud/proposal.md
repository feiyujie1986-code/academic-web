# Change: 课程模板录播视频上传改用云存储直传

## Why

课程模板排课中新增或编辑录播视频时，当前使用的是旧的分片上传方案（`useChunkUpload`），数据需要经过服务器中转，导致：
1. 服务器带宽压力大
2. 上传速度受服务器带宽限制
3. 与资料中心已完成的云存储直传方案不一致

需要将录播视频上传切换为新的云存储直传方案（`useCloudUpload`），与资料中心保持一致，提升上传体验。

## What Changes

- **MODIFIED** `src/pages/class/detail/components/ChunkVideoUpload.vue` - 将 `useChunkUpload` 替换为 `useCloudUpload`
- **MODIFIED** 状态映射逻辑 - 适配新的 `UploadStatus` 类型（`idle` → `idle`, `hashing` → `hashing`, `checking` → `initializing`, `uploading` → `uploading`, `paused` → `paused`, `merging` → `completing`, `success` → `completed`, `error` → `error`）
- **MODIFIED** 返回结果类型适配 - `ChunkUploadFileInfo` → `UploadFileInfo`

### 核心变化

| 方面 | 旧方案 (useChunkUpload) | 新方案 (useCloudUpload) |
|------|------------------------|------------------------|
| 上传路径 | 文件 → 服务器 → 云存储 | 文件 → 云存储直传 |
| 小文件 (<5MB) | 分片上传 | 直传 (PUT) |
| 大文件 (≥5MB) | 服务器分片合并 | Multipart 分片直传 |
| 进度显示 | 分片计数 | XMLHttpRequest 实时进度 |
| API 接口 | `/v2/admin/files/chunk/*` | `/v2/admin/files/direct/*` 和 `/v2/admin/files/multipart/*` |

### 不变的部分

- 组件对外接口不变（`v-model` 绑定 `fileMeta`）
- UI 交互不变（暂停、继续、取消、删除）
- 支持的视频格式不变
- 秒传功能保留

## Impact

- **Affected specs**: NONE (新增功能无 spec)
- **Affected code**:
  - `src/pages/class/detail/components/ChunkVideoUpload.vue`
- **Dependencies**:
  - 新 API 已实现：`src/api/fileM/direct.ts`, `src/api/fileM/multipart.ts`
  - 新 composable 已实现：`src/composables/useCloudUpload.ts`
- **风险**: 低（组件对外接口不变，仅内部实现替换）