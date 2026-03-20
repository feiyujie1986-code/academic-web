# 资料中心云存储直传上传方案

## 一、概述

本方案将资料中心的文件上传从「服务器中转」改为「云存储直传」，大幅减少服务器带宽压力，提升上传速度。

### 核心优势

| 特性 | 旧方案（分片上传） | 新方案（云存储直传） |
|-----|------------------|-------------------|
| 服务器压力 | 高（数据经过服务器） | 低（直传云存储） |
| 上传速度 | 受服务器带宽限制 | 受客户端带宽限制 |
| 带宽节省 | 0% | 80%-95% |
| 秒传 | ✅ | ✅ |
| 断点续传 | ✅ | ✅（≥5MB） |
| 并发上传 | ❌ | ✅ |
| 实时进度 | ✅ | ✅ |

---

## 二、上传策略

根据文件大小自动选择最优上传方式：

| 文件大小 | 上传方式 | 接口路径 | 特点 |
|---------|---------|---------|------|
| < 5MB | 直传（PUT） | `/v2/admin/files/direct/*` | 简单快速，一次上传，实时进度 |
| ≥ 5MB | Multipart 分片直传 | `/v2/admin/files/multipart/*` | 断点续传、并发上传 |

---

## 三、技术实现

### 3.1 API 层

#### 直传 API `src/api/fileM/direct.ts`

```typescript
// 初始化直传
initDirectUpload(data: InitDirectUploadReq): Promise<DirectUploadInitRes>

// 确认上传完成
confirmDirectUpload(data: ConfirmDirectUploadReq): Promise<UploadFileInfo>

// 上传到云存储（使用 XMLHttpRequest 确保进度可靠）
uploadToCloud(url, file, headers, onProgress): Promise<string | null>

// 带取消功能的上传
uploadToCloudWithCancel(url, file, headers, onProgress): { promise, cancel }
```

#### Multipart 分片直传 API `src/api/fileM/multipart.ts`

```typescript
// 初始化分片上传
initMultipartUpload(data): Promise<MultipartUploadInitRes>

// 获取分片预签名 URL
getPartUrl(data): Promise<PartUrlRes>

// 上报分片完成
reportPartComplete(data): Promise<PartCompleteRes>

// 完成上传（合并分片）
completeMultipartUpload(uploadId): Promise<MultipartCompleteRes>

// 查询上传状态（用于断点续传）
getMultipartStatus(uploadId): Promise<MultipartStatusRes>

// 取消上传
abortMultipartUpload(uploadId): Promise<null>
```

### 3.2 上传 Composable

**文件**: `src/composables/useCloudUpload.ts`

```typescript
const {
  status,    // 上传状态
  progress,  // 上传进度 0-100
  error,     // 错误信息
  result,    // 上传结果
  upload,    // 开始上传
  pause,     // 暂停（仅 Multipart）
  resume,    // 继续（仅 Multipart）
  cancel,    // 取消上传
  reset      // 重置状态
} = useCloudUpload({
  concurrency: 3,  // 并发数
  onProgress,      // 进度回调
  onStatusChange,  // 状态变化回调
  onSuccess,       // 成功回调
  onError          // 错误回调
})
```

---

## 四、上传流程

### 4.1 直传流程（< 5MB）

```
1. 计算文件 MD5（进度 0%-5%）
   ↓
2. 调用 /direct/init 初始化
   ├── uploadMethod="instant" → 秒传成功，返回文件信息
   └── uploadMethod="direct" → 继续步骤 3
   ↓
3. PUT 上传到预签名 URL（进度 5%-95%，XMLHttpRequest 实时进度）
   ↓
4. 调用 /direct/confirm 确认（进度 95%-100%）
   ↓
5. 返回文件信息
```

### 4.2 Multipart 分片流程（≥ 5MB）

```
1. 计算文件 MD5（进度 0%-5%）
   ↓
2. 检查本地断点 → 有则恢复，无则调用 /multipart/init
   ├── uploadMethod="instant" → 秒传成功
   └── uploadMethod="multipart" → 继续步骤 3
   ↓
3. 并发上传分片（进度 5%-95%）
   ├── 获取分片预签名 URL
   ├── PUT 上传分片到云存储
   ├── 上报分片完成
   └── 保存断点到 localStorage
   ↓
4. 调用 /multipart/complete 合并（进度 95%-100%）
   ↓
5. 清除断点，返回文件信息
```

---

## 五、进度计算

### 5.1 进度分配

| 阶段 | 进度范围 | 说明 |
|-----|---------|------|
| 计算 MD5 | 0% - 5% | 分块读取文件计算哈希 |
| 初始化/检查 | 5% | 调用 init 接口 |
| 上传文件 | 5% - 95% | 实时显示上传进度 |
| 确认/合并 | 95% - 100% | 调用 confirm/complete |

### 5.2 直传进度实现

直传使用 `XMLHttpRequest` 的 `upload.onprogress` 事件获取实时进度：

```typescript
// src/api/fileM/direct.ts
export function uploadToCloudWithCancel(
  uploadUrl: string,
  file: File | Blob,
  headers: Record<string, string>,
  onProgress?: (progress: number) => void
): { promise: Promise<string | null>, cancel: () => void } {
  const xhr = new XMLHttpRequest()

  const promise = new Promise<string | null>((resolve, reject) => {
    // 实时上传进度
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag")?.replace(/"/g, "") || null
        resolve(etag)
      } else {
        reject(new Error(`上传失败: ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error("网络错误"))
    xhr.ontimeout = () => reject(new Error("上传超时"))
    xhr.onabort = () => reject(new Error("上传已取消"))

    xhr.open("PUT", uploadUrl, true)
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })
    xhr.send(file)
  })

  return { promise, cancel: () => xhr.abort() }
}
```

**为什么使用 XMLHttpRequest 而不是 fetch/axios？**

| 方案 | 上传进度支持 | 跨域兼容性 | 取消支持 |
|-----|------------|----------|---------|
| XMLHttpRequest | ✅ `upload.onprogress` | ✅ 原生支持 | ✅ `xhr.abort()` |
| fetch | ❌ 不支持上传进度 | ✅ | ✅ AbortController |
| axios | ⚠️ 跨域时可能不触发 | ⚠️ 依赖底层实现 | ✅ |

直传到云存储是跨域请求，`XMLHttpRequest` 的 `upload.onprogress` 是最可靠的进度获取方式。

### 5.3 Multipart 精细进度

对于分片上传，每个分片内部也有平滑进度：

```
总进度 = (已完成分片数 + 当前上传中分片的进度之和/100) / 总分片数
```

---

## 六、断点续传

### 6.1 断点信息存储

使用 localStorage 存储断点信息：

```typescript
interface Checkpoint {
  uploadId: string      // 上传任务 ID
  objectKey: string     // 对象键
  partSize: number      // 分片大小
  totalParts: number    // 总分片数
  uploadedParts: number[] // 已上传分片列表
  fileHash: string      // 文件 MD5（用于验证）
  fileName: string      // 文件名
  fileSize: number      // 文件大小
}
```

**存储 Key**: `multipart_${fileName}`

### 6.2 恢复流程

```
1. 检查本地是否有断点
   ↓
2. 验证文件 MD5 是否匹配
   ├── 不匹配 → 清除断点，重新上传
   └── 匹配 → 继续步骤 3
   ↓
3. 调用 /multipart/status 同步服务端状态
   ├── expired/failed → 清除断点，重新上传
   └── uploading → 继续步骤 4
   ↓
4. 只上传未完成的分片
```

---

## 七、错误处理

### 7.1 分片重试

单个分片上传失败时，自动重试 3 次，指数退避：

```typescript
重试间隔: 1秒 → 2秒 → 4秒
```

### 7.2 错误类型

| 错误 | 处理方式 |
|-----|---------|
| 网络错误 | 自动重试 |
| 超时 | 自动重试 |
| 预签名 URL 过期 | 重新获取 URL |
| 上传记录过期 | 重新初始化上传 |
| 服务器错误 | 提示用户 |

---

## 八、配置选项

```typescript
interface CloudUploadOptions {
  concurrency?: number  // 并发数，默认 3
  onProgress?: (progress: number) => void
  onStatusChange?: (status: UploadStatus) => void
  onSuccess?: (result: UploadFileInfo) => void
  onError?: (error: Error) => void
}
```

### 建议配置

| 环境 | 并发数 | 说明 |
|-----|-------|------|
| PC 浏览器 | 3-5 | 平衡速度和稳定性 |
| 移动端 | 1-2 | 避免卡顿 |
| 弱网环境 | 1-2 | 减少失败率 |

---

## 九、各功能上传方式

### 9.1 上传方式总览

| 功能 | 上传方式 | 接口/组件 | 说明 |
|------|---------|----------|------|
| 资料中心文件上传 | 云存储直传 | `useCloudUpload` | 支持断点续传、秒传 |
| 课程模板录播视频上传 | 云存储直传 | `ChunkVideoUpload.vue` + `useCloudUpload` | 支持暂停/继续、取消 |
| 课程模板附件上传 | 云存储直传 | `LessonForm.vue` + `useCloudUpload` | 最多3个附件 |
| 富文本图片上传 | 服务器中转 | `/v2/admin/files/upload-image` | 保持原有逻辑 |

### 9.2 课程模板录播视频上传

**文件**: `src/pages/class/detail/components/ChunkVideoUpload.vue`

使用 `useCloudUpload` composable，根据文件大小自动选择上传方式：
- < 5MB：直传
- ≥ 5MB：Multipart 分片直传

**功能特性**：
- 实时进度显示
- 支持暂停/继续（仅大文件）
- 支持取消上传（清理云端已上传分片）
- 失败自动重试（最多3次，静默重试）
- 秒传支持

**状态映射**：
| 状态 | 文本显示 |
|------|---------|
| `idle` | 无 |
| `hashing` | 计算文件指纹中... |
| `initializing` | 初始化上传中... |
| `uploading` | 上传中 X% |
| `paused` | 已暂停 X% |
| `completing` | 完成中... |
| `completed` | 上传完成 |
| `error` | 上传失败 |
| `cancelled` | 已取消 |

### 9.3 课程模板附件上传

**文件**: `src/pages/class/detail/components/LessonForm.vue`

使用 `useCloudUpload` composable，通过 `el-upload` 的 `:http-request` 自定义上传。

#### 支持的文件类型

| 类型 | 扩展名 | 图标 |
|------|-------|------|
| Excel | xls, xlsx | file-excel-icon |
| CSV | csv | file-csv-icon |
| Word | doc, docx | file-word-icon |
| PPT | ppt, pptx | file-ppt-icon |
| PDF | pdf | file-pdf-icon |
| 文本 | txt, rtf | file-text-icon |
| 音频 | mp3, wav, m4a | file-mp3-icon |
| 视频 | mp4, avi, mov, mkv, flv, wmv, webm, m4v | file-mp4-icon |
| 压缩文件 | zip, rar, 7z, tar, gz | file-zip-icon |
| GIF | gif | file-gif-icon |
| SVG | svg | file-svg-icon |
| 其他图片 | jpg, jpeg, png, webp, bmp | file-img-icon |

**不在上述列表中的文件类型将被拒绝上传。**

#### 文件类型验证

```typescript
// 支持的附件文件扩展名
const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "xls", "xlsx", "csv", "doc", "docx", "ppt", "pptx", "pdf",
  "txt", "rtf", "mp3", "wav", "m4a",
  "mp4", "avi", "mov", "mkv", "flv", "wmv", "webm", "m4v",
  "zip", "rar", "7z", "tar", "gz",
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"
]

// 验证附件文件类型
function validateAttachmentFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    ElMessage.error(`不支持的文件格式: .${ext}`)
    return false
  }
  return true
}
```

#### 上传实现

```typescript
// el-upload 配置
<el-upload
  :file-list="attachmentsList"
  :on-remove="handleRemoveAttachment"
  :http-request="customUploadAttachment"
  :before-upload="beforeAttachmentUpload"
  :limit="3"
>

// 上传前校验
function beforeAttachmentUpload(file: File): boolean {
  return validateAttachmentFile(file)
}

// 自定义上传
async function customUploadAttachment(options: UploadRequestOptions) {
  const file = options.file

  // 二次校验文件类型
  if (!validateAttachmentFile(file)) {
    options.onError?.(new Error("不支持的文件格式") as any)
    return
  }

  const { upload, reset } = useCloudUpload({
    onProgress: (progress) => {
      options.onProgress?.({ percent: progress } as any)
    }
  })
  // ... 上传逻辑
}
```

**附件限制**：最多上传 3 个附件。

### 9.4 富文本图片上传

**文件**: `src/pages/class/detail/components/LessonForm.vue`

**接口**: `POST /v2/admin/files/upload-image`（服务器中转）

富文本图片上传保持使用服务器中转方式，原因：
1. 图片文件通常较小，服务器压力可接受
2. 服务器可以对图片进行格式校验和处理
3. 返回的 `fullpath` 直接可用于富文本展示

```typescript
import { uploadImage } from "@/api/fileM/file"

// 在 handleImageUpload 中
const res = await uploadImage(file, updateProgress)
if (res.code === 0 && res.data?.fullpath) {
  quill.insertEmbed(insertIndex, "image", res.data.fullpath)
}
```

---

## 十、重试机制

### 10.1 重试策略

上传过程中如果接口超时或失败，会自动进行静默重试：

| 配置项 | 值 | 说明 |
|-------|---|------|
| 最大重试次数 | 3次 | 超过后显示"上传失败" |
| 重试方式 | 静默 | 前2次失败不展示错误 |
| 取消操作 | 立即终止 | 包括重试中的请求 |

### 10.2 直传重试

直传（< 5MB）使用 `withRetry` 包裹上传操作，失败时自动重试：

```typescript
const etag = await withRetry(async () => {
  const { promise, cancel } = uploadToCloudWithCancel(...)
  activeUploads = [{ cancel }]
  return await promise
}, () => isCancelled)
```

### 10.3 分片上传重试

分片上传（≥ 5MB）每个分片独立跟踪重试次数：

```typescript
// 分片重试次数跟踪
const partRetryCount: Record<number, number> = {}

// 失败时
partRetryCount[partNumber] = (partRetryCount[partNumber] || 0) + 1
if (partRetryCount[partNumber] >= MAX_RETRIES) {
  throw new Error("上传失败")
}
// 未超过重试次数，静默放回队列继续重试
uploadQueue.push(partNumber)
```

---

## 十一、涉及文件清单

| 文件路径 | 操作 | 说明 |
|---------|------|------|
| `src/api/fileM/direct.ts` | 新建 | 直传 API |
| `src/api/fileM/multipart.ts` | 新建 | Multipart 分片直传 API |
| `src/composables/useCloudUpload.ts` | 新建 | 云存储上传 Composable |
| `src/pages/document/list/index.vue` | 修改 | 资料中心使用新上传方式 |
| `src/pages/class/detail/components/ChunkVideoUpload.vue` | 修改 | 录播视频使用云存储直传 |
| `src/pages/class/detail/components/LessonForm.vue` | 修改 | 附件上传使用云存储直传 |
| `src/api/fileM/file.ts` | 保留 | 富文本图片上传（服务器中转） |

---

## 十二、使用示例

### 12.1 基础使用

```typescript
import { useCloudUpload } from "@/composables/useCloudUpload"

const uploader = useCloudUpload({
  onProgress: (progress) => {
    console.log(`上传进度: ${progress}%`)
  },
  onSuccess: (file) => {
    console.log("上传成功:", file)
  }
})

// 开始上传
await uploader.upload(file)
```

### 12.2 带暂停/继续

```typescript
const uploader = useCloudUpload()

// 开始上传
uploader.upload(file)

// 暂停
uploader.pause()

// 继续
await uploader.resume(file)
```

### 12.3 取消上传

```typescript
const uploader = useCloudUpload()

uploader.upload(file)

// 取消（会清理云存储已上传的分片）
await uploader.cancel()
```

---

## 十三、Multipart API 详细说明

### 13.1 初始化 Multipart 上传

**请求**: `POST /v2/admin/files/multipart/init`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| fileName | string | 是 | 文件名 |
| fileSize | integer | 是 | 文件大小(字节) |
| fileMd5 | string | 是 | 文件MD5(32位小写) |
| mimeType | string | 是 | MIME类型 |
| partSize | integer | 否 | 分片大小(字节),最小5MB,不传则自动计算 |

**响应** (正常初始化):
```json
{
  "code": 0,
  "msg": "初始化成功",
  "data": {
    "uploadId": "multipart_xxx",
    "uploadMethod": "multipart",
    "objectKey": "uploads/2025/01/14/file.mp4",
    "partSize": 10485760,
    "totalParts": 103,
    "expiresAt": 1737187200
  }
}
```

**响应** (秒传):
```json
{
  "code": 0,
  "msg": "文件已存在,秒传成功",
  "data": {
    "uploadMethod": "instant",
    "file": { "id": 123, "filename": "video.mp4", "fullpath": "https://cdn.example.com/video.mp4", "size": 1073741824, "md5": "5d41402abc4b2a76b9719d911017c592" }
  }
}
```

### 13.2 获取分片预签名 URL

**请求**: `POST /v2/admin/files/multipart/part-url`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| uploadId | string | 是 | 上传任务ID |
| partNumber | integer | 是 | 分片序号(1-based) |

**响应**:
```json
{
  "code": 0,
  "data": {
    "uploadId": "multipart_xxx",
    "partNumber": 1,
    "uploadUrl": "https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/file.mp4?partNumber=1&uploadId=xxx&Signature=xxx",
    "expiresAt": 1737108000
  }
}
```

### 13.3 上报分片完成

**请求**: `POST /v2/admin/files/multipart/part-complete`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| uploadId | string | 是 | 上传任务ID |
| partNumber | integer | 是 | 分片序号(1-based) |
| etag | string | 是 | 云存储返回的ETag |
| size | integer | 是 | 分片实际大小(字节) |

**响应**:
```json
{
  "code": 0,
  "data": {
    "partNumber": 1,
    "uploaded": true,
    "progress": {
      "uploadedChunks": 1,
      "totalChunks": 103,
      "percent": 0.97,
      "uploadedSize": 10485760
    }
  }
}
```

### 13.4 完成 Multipart 上传

**请求**: `POST /v2/admin/files/multipart/complete`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| uploadId | string | 是 | 上传任务ID |

**响应**:
```json
{
  "code": 0,
  "data": {
    "file": { "id": 124, "filename": "video.mp4", "fullpath": "https://cdn.example.com/video.mp4", "size": 1073741824, "md5": "5d41402abc4b2a76b9719d911017c592" }
  }
}
```

### 13.5 查询上传状态

**请求**: `GET /v2/admin/files/multipart/status?uploadId=xxx`

**响应**:
```json
{
  "code": 0,
  "data": {
    "uploadId": "multipart_xxx",
    "fileName": "large-video.mp4",
    "fileSize": 1073741824,
    "partSize": 10485760,
    "totalParts": 103,
    "status": "uploading",
    "progress": {
      "uploadedChunks": 50,
      "totalChunks": 103,
      "percent": 48.54,
      "uploadedSize": 524288000
    },
    "uploadedPartList": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }
}
```

**状态说明**:
- `pending`: 初始化完成,等待上传
- `uploading`: 上传中
- `completed`: 已完成
- `failed`: 失败
- `expired`: 已过期

### 13.6 取消上传

**请求**: `DELETE /v2/admin/files/multipart/abort?uploadId=xxx`

**响应**:
```json
{
  "code": 0,
  "msg": "已取消上传",
  "data": null
}
```

---

## 十四、注意事项

1. **分片大小限制**
   - 最小分片大小: 5MB (云存储限制)
   - 最大分片大小: 100MB (建议)
   - 最大分片数: 10000个
   - 建议让服务端自动计算分片大小

2. **并发控制**
   - 建议并发数: 3-5个
   - 避免过高并发导致浏览器卡顿
   - 移动端建议并发数1-2个

3. **断点续传**
   - 使用localStorage保存断点信息
   - 使用文件MD5验证文件是否改变
   - 恢复上传前先查询服务端状态同步进度

4. **有效期管理**
   - 上传记录有效期24小时
   - 分片预签名URL有效期2小时
   - URL过期后重新获取即可

5. **错误处理**
   - 实现分片上传失败重试机制
   - 记录上传日志便于排查问题
   - 提供取消上传功能

6. **性能优化**
   - 大文件MD5计算使用增量计算
   - 使用Web Worker避免阻塞主线程（可选）
   - 合理设置并发数平衡速度和稳定性

7. **直传进度显示**
   - 使用 XMLHttpRequest 而非 fetch/axios
   - 跨域上传时 `upload.onprogress` 最可靠
   - 进度映射: MD5 0-5%, 上传 5-95%, 确认 95-100%