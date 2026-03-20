# 错误提示优化方案

## 一、概述

本方案优化项目中的错误提示机制，实现：

1. **静默模式**：非关键接口失败时不打扰用户
2. **超时自动重试**：超时自动重试3次，全部失败后显示友好弹窗
3. **登录错误分类处理**：不暴露敏感信息，账号禁用显示友好提示

---

## 二、技术实现

### 2.1 新增类型定义

**文件**: `src/http/types.d.ts`

```typescript
import "axios"

declare module "axios" {
  interface AxiosRequestConfig {
    /**
     * 静默模式配置
     * - true: 所有错误都静默
     * - "timeout": 仅超时错误静默（重试全部失败后不显示弹窗）
     */
    silent?: boolean | "timeout"
    /**
     * 当前重试次数（内部使用）
     */
    __retryCount?: number
  }
}
```

### 2.2 axios 拦截器核心代码

**文件**: `src/http/axios_n.ts`

#### 2.2.1 常量和工具函数

```typescript
/** 最大重试次数 */
const MAX_RETRY_COUNT = 3

/** 判断是否为超时错误 */
function isTimeoutError(error: any): boolean {
  return error.code === "ECONNABORTED" || error.message?.includes("timeout")
}

/** 判断是否应该静默处理错误 */
function shouldSilent(config: AxiosRequestConfig | undefined, isTimeout = false): boolean {
  const silent = config?.silent
  if (silent === true) return true
  if (silent === "timeout" && isTimeout) return true
  return false
}
```

#### 2.2.2 超时友好弹窗

```typescript
/** 显示超时友好弹窗，返回用户是否选择重试 */
async function showTimeoutDialog(): Promise<boolean> {
  try {
    await ElMessageBox.confirm(
      "请求响应时间过长，请检查您的网络设置后重试。",
      "网络有点开小差",
      {
        confirmButtonText: "重新连接",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
    return true
  } catch {
    return false
  }
}
```

#### 2.2.3 超时自动重试逻辑

```typescript
// 响应拦截器错误处理
async (error) => {
  const config: AxiosRequestConfig | undefined = get(error, "config")
  const isTimeout = isTimeoutError(error)

  // 超时自动重试逻辑
  if (isTimeout && config) {
    const retryCount = config.__retryCount || 0

    // 未达到最大重试次数，自动重试
    if (retryCount < MAX_RETRY_COUNT) {
      config.__retryCount = retryCount + 1
      return instance(config)
    }

    // 达到最大重试次数
    // 如果是静默模式，直接返回错误
    if (shouldSilent(config, true)) {
      return Promise.reject(error)
    }

    // 显示友好弹窗
    const shouldRetry = await showTimeoutDialog()
    if (shouldRetry) {
      // 用户选择重新连接，重置重试计数并重新请求
      config.__retryCount = 0
      return instance(config)
    }

    // 用户选择取消
    return Promise.reject(error)
  }

  // ... 其他错误处理
}
```

### 2.3 超时弹窗文案

| 项目 | 内容                                         |
| ---- | -------------------------------------------- |
| 标题 | 网络有点开小差                               |
| 内容 | 请求响应时间过长，请检查您的网络设置后重试。 |
| 按钮 | [取消] [重新连接]                            |

### 2.4 登录 API 修改

**文件**: `src/api/base/login.ts`

```typescript
// 登录 - 静默，由页面层处理
export function loginApi(data: LoginRequestData) {
  return request<LoginResponseData>({
    url: "/v2/admin/auth/login",
    method: "post",
    data,
    silent: true
  })
}

// 登出 - 完全静默
export function logoutApi() {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/auth/logout",
    method: "post",
    data: {},
    silent: true
  })
}
```

### 2.5 登录页面错误处理

**文件**: `src/pages/login/index.vue`

```typescript
/** 登录逻辑 */
function handleLogin() {
  loginFormRef.value?.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await useUserStore().login({
          username: loginFormData.username,
          password: loginFormData.password,
          captcha: loginFormData.captcha,
          captchaId: loginFormData.captchaId
        })
        router.push({ path: "/" })
      } catch (error: any) {
        const errorMsg = typeof error === "string" ? error : ""

        if (errorMsg.includes("禁用")) {
          // 账号被禁用
          ElMessageBox.alert(
            "抱歉，您的账号已被管理员禁用。如有疑问，请联系超级管理员或大使长获取帮助。",
            "当前账号暂时无法登录",
            {
              confirmButtonText: "我知道了",
              type: "warning"
            }
          )
        } else if (errorMsg.includes("未激活")) {
          // 账号未激活
          ElMessageBox.alert(
            "抱歉，您的账号未激活。如有疑问，请联系超级管理员或大使长获取帮助。",
            "当前账号暂时无法登录",
            {
              confirmButtonText: "我知道了",
              type: "warning"
            }
          )
        } else if (errorMsg.includes("验证码")) {
          ElMessage.error("验证码错误，请重新输入")
        } else if (errorMsg.includes("频繁") || errorMsg.includes("次数")) {
          ElMessage.error(errorMsg)
        } else {
          ElMessage.error("邮箱或密码错误，请重试")
        }
        createCode()
      } finally {
        loading.value = false
      }
    }
  })
}
```

根据错误类型显示不同提示：

| 错误类型   | 识别方式           | 提示方式                  |
| ---------- | ------------------ | ------------------------- |
| 账号被禁用 | 包含"禁用"关键字   | `ElMessageBox.alert` 弹窗 |
| 账号未激活 | 包含"未激活"关键字 | `ElMessageBox.alert` 弹窗 |
| 验证码错误 | 包含"验证码"关键字 | `ElMessage.error`         |
| 频率限制   | 包含"频繁"或"次数" | 保留原提示                |
| 其他错误   | 默认               | "邮箱或密码错误，请重试"  |

### 2.6 文件上传超时静默

**文件**: `src/api/fileM/chunk.ts`, `src/api/fileM/file.ts`

```typescript
// 分片上传 - 仅超时静默（重试失败后不显示弹窗）
export function uploadChunk(uploadId: string, chunkIndex: number, chunk: Blob, chunkMd5?: string) {
  // ...
  return request<ApiResponseData<UploadChunkRes>>({
    url: "/v2/admin/files/chunks/upload",
    method: "post",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
    silent: "timeout" // 仅超时静默
  })
}

// 合并分片 - 仅超时静默
export function completeChunkUpload(uploadId: string) {
  return request<ApiResponseData<CompleteChunkUploadRes>>({
    url: "/v2/admin/files/chunks/complete",
    method: "post",
    data: { uploadId },
    timeout: 300000,
    silent: "timeout" // 仅超时静默
  })
}

// 图片上传 - 仅超时静默
export function uploadImage(file: File, onProgress?: (percent: number) => void) {
  // ...
  return request<ApiResponseData<fileData>>({
    url: "/v2/admin/files/upload-image",
    method: "post",
    data: formData,
    timeout: 60000,
    silent: "timeout", // 仅超时静默
    headers: { "Content-Type": "multipart/form-data" }
    // ...
  })
}
```

---

## 三、超时处理流程

```
请求发起
    ↓
超时发生
    ↓
自动重试（最多3次）
    ↓
全部失败
    ↓
判断 silent 配置
    ├── silent: true → 静默返回错误
    ├── silent: "timeout" → 静默返回错误
    └── 未设置 → 显示友好弹窗
                    ├── 点击"取消" → 返回错误
                    └── 点击"重新连接" → 重置计数，重新请求
```

---

## 四、配置汇总

| 接口类型                       | silent 配置 | 超时处理                      |
| ------------------------------ | ----------- | ----------------------------- |
| 登录 `loginApi`                | `true`      | 静默，页面层处理              |
| 登出 `logoutApi`               | `true`      | 静默                          |
| 验证码 `captcha`               | `true`      | 静默                          |
| 分片上传 `uploadChunk`         | `"timeout"` | 重试3次后静默                 |
| 合并分片 `completeChunkUpload` | `"timeout"` | 重试3次后静默                 |
| 图片上传 `uploadImage`         | `"timeout"` | 重试3次后静默                 |
| 列表查询（可选扩展）           | `true`      | 静默                          |
| 下拉选项加载（可选扩展）       | `true`      | 静默                          |
| 增删改操作                     | 不设置      | 重试3次后显示弹窗，可重新连接 |

---

## 五、登录错误提示文案

### 5.1 账号被禁用

**提示方式**: `ElMessageBox.alert` 弹窗

- **标题**: 当前账号暂时无法登录
- **内容**: 抱歉，您的账号已被管理员禁用。如有疑问，请联系超级管理员或大使长获取帮助。
- **按钮**: 我知道了

### 5.2 账号未激活

**提示方式**: `ElMessageBox.alert` 弹窗

- **标题**: 当前账号暂时无法登录
- **内容**: 抱歉，您的账号未激活。如有疑问，请联系超级管理员或大使长获取帮助。
- **按钮**: 我知道了

### 5.3 验证码错误

**提示方式**: `ElMessage.error`

- **文案**: 验证码错误，请重新输入

### 5.4 频率限制

**提示方式**: `ElMessage.error`

- **文案**: 保留后端原提示（如"登录次数过多，请稍后再试"）

### 5.5 其他登录错误

**提示方式**: `ElMessage.error`

- **文案**: 邮箱或密码错误，请重试

---

## 六、涉及文件清单

| 文件路径                    | 操作 |
| --------------------------- | ---- |
| `src/http/types.d.ts`       | 新建 |
| `src/http/axios_n.ts`       | 修改 |
| `src/api/base/login.ts`     | 修改 |
| `src/pages/login/index.vue` | 修改 |
| `src/api/fileM/chunk.ts`    | 修改 |
| `src/api/fileM/file.ts`     | 修改 |

---

## 七、后续可选扩展

如需将更多接口设为静默模式，可在对应 API 调用中添加 `silent: true`：

```typescript
// 示例：机构列表
export function getOrganizationsApi(data: PageInfo) {
  return request<ApiResponseData<ListData<OrganizationModel>>>({
    method: "post",
    url: "/organization/getOrganizations",
    data,
    silent: true // 添加静默模式
  })
}
```

建议静默的接口类型：

- 所有列表查询接口
- 所有下拉选项加载接口
- 非关键性数据获取接口
