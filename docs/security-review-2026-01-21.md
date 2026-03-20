# 安全审查报告

**审查日期**: 2026-01-21
**审查分支**: dev (对比 main)
**审查工具**: Claude Code Security Review

---

## 总结

对本次 PR 的所有变更进行了全面的安全分析，**未发现需要立即处理的高置信度安全漏洞（置信度 ≥ 8/10）**。

---

## 审查范围

### 变更文件统计
- 总计变更文件: 150+ 文件
- 新增功能模块: 通知中心、社区管理、反馈中心
- API 更新: V1 升级至 V2 版本
- 基础设施: 新增 CI/CD 工作流

### 审查的安全类别

| 类别 | 状态 | 说明 |
|------|------|------|
| 输入验证 | ✅ 通过 | 表单验证完善，使用 TypeScript 类型约束 |
| 认证授权 | ✅ 通过 | Token 机制未变更，401/403 正确处理 |
| 注入攻击 | ✅ 通过 | 未发现 SQL/命令注入模式 |
| XSS 跨站脚本 | ✅ 通过 | 本次 PR 未引入新的 XSS 风险 |
| 敏感信息泄露 | ✅ 通过 | 未发现硬编码的密钥或凭证 |
| 文件操作 | ✅ 通过 | 云存储使用预签名 URL，服务端控制 |

---

## 详细分析

### 1. 输入验证

**审查结果**: 安全

通知中心等新增页面使用了完善的表单验证：
- `maxlength` 限制输入长度
- `required` 必填字段校验
- 自定义验证器（如表情符号检测）
- TypeScript 接口类型约束

```typescript
// 示例：通知名称验证规则
const formRules: FormRules = {
  title: [
    { required: true, message: "请输入通知名称", trigger: "blur" },
    { max: 100, message: "通知名称不能超过100个字符", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (value && hasEmoji(value)) {
          callback(new Error("通知名称不支持表情符号"))
        } else {
          callback()
        }
      },
      trigger: "blur"
    }
  ]
}
```

### 2. 认证与授权

**审查结果**: 安全

- Token 通过 `x-token` 请求头传递
- 401/403 响应正确触发登出和页面刷新
- 路由守卫正确检查用户登录状态

```typescript
// axios 拦截器中的认证处理
case 401:
  error.message = message || "未授权"
  logout()
  return Promise.reject(error)
case 403:
  error.message = message || "拒绝访问"
  break
```

### 3. 注入攻击

**审查结果**: 安全

- 未发现 `eval()`、`Function()` 或动态代码执行
- 模板字符串仅用于 UI 文本和 API URL 路径
- 所有用户输入通过 axios 拦截器发送至后端验证

### 4. XSS 跨站脚本

**审查结果**: 安全（本次 PR 未引入新风险）

| 文件 | 代码 | 说明 |
|------|------|------|
| `RichTextViewer.vue:89` | `v-html="props.content"` | **已存在**，非本次 PR 引入 |
| `LessonForm.vue:135` | `placeholder.innerHTML = ...` | 使用硬编码模板，安全 |

**注意**: `v-html` 使用属于已有技术债务，建议后续迭代中添加 DOMPurify 净化。

### 5. 敏感信息

**审查结果**: 安全

| 文件 | 内容 | 风险评估 |
|------|------|----------|
| `.env.development` | 开发服务器 IP `114.55.60.47` | 低风险（私有仓库、开发环境） |
| `.env.production` | 无敏感信息 | 安全 |
| `.github/DEPLOYMENT.md` | `YOUR_TOKEN` 占位符 | 安全（示例代码） |

### 6. 文件操作

**审查结果**: 安全

云存储上传功能使用安全的设计模式：
1. 客户端请求后端获取预签名 URL
2. 使用预签名 URL 直传云存储
3. 后端确认上传完成

```typescript
// 预签名 URL 由后端生成和控制
const { uploadUrl, uploadHeaders } = initRes.data
xhr.open("PUT", uploadUrl, true)  // uploadUrl 来自可信后端
```

---

## 低于报告阈值的发现

以下发现因置信度较低（< 8/10）未列入正式漏洞报告：

| 问题 | 文件 | 置信度 | 排除原因 |
|------|------|--------|----------|
| 开发服务器 IP 暴露 | `.env.development:13` | 3/10 | 私有仓库、开发配置、非凭证信息 |
| v-html 未净化 | `RichTextViewer.vue:89` | 3/10 | 已有代码，非本次 PR 引入 |

---

## 安全建议

虽然未发现关键漏洞，以下建议可进一步提升安全性：

### 短期建议

1. **开发环境配置**
   - 考虑使用域名替代 IP 地址
   - 使用 `.env.local` 存储本地开发配置

2. **v-html 净化**（技术债务）
   ```typescript
   import DOMPurify from "dompurify"
   const sanitizedContent = DOMPurify.sanitize(props.content)
   ```

### 长期建议

1. 考虑添加 CSRF Token 机制
2. 实现敏感操作的二次确认
3. 添加安全相关的自动化测试

---

## 审查结论

| 项目 | 结果 |
|------|------|
| 安全审查状态 | ✅ **通过** |
| 阻塞性问题 | 0 |
| 高风险问题 | 0 |
| 中风险问题 | 0 |
| 低风险/建议 | 2 |

**本次 PR 通过安全审查，无阻塞性发现。**

---

## 附录：审查的主要文件

<details>
<summary>点击展开文件列表</summary>

### API 层
- `src/api/notice/notice.ts`
- `src/api/fileM/direct.ts`
- `src/api/fileM/multipart.ts`
- `src/api/fileM/chunk.ts`
- `src/api/im/community.ts`
- `src/api/im/conversation.ts`
- `src/api/feedback/feedback.ts`

### 页面组件
- `src/pages/notice/add/index.vue`
- `src/pages/notice/edit/index.vue`
- `src/pages/notice/list/index.vue`
- `src/pages/notice/detail/index.vue`
- `src/pages/feedback/detail/index.vue`
- `src/pages/community/manage/index.vue`
- `src/pages/class/detail/components/RichTextViewer.vue`
- `src/pages/class/detail/components/LessonForm.vue`

### 核心模块
- `src/http/axios_n.ts`
- `src/composables/useCloudUpload.ts`
- `src/composables/useChunkUpload.ts`
- `src/router/guard_n.ts`

### 配置文件
- `.env.development`
- `.env.production`
- `.env.staging`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

</details>

---

*报告生成时间: 2026-01-21*
*审查工具: Claude Opus 4.5*