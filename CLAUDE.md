# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **td27-admin**, a Vue 3 admin dashboard for an educational management system (courses, classes, members, authority management). Built with TypeScript, Element Plus, and Vite.

## Commands

```bash
# Development
pnpm  dev              # Start dev server (port 8080)

# Build
pnpm  build            # Production build (with type checking)
npm run build:staging    # Staging build

# Lint
pnpm run lint             # ESLint with auto-fix (uses @antfu/eslint-config)

# Preview
pnpm run preview          # Preview production build
```

## Architecture

### Path Aliases
- `@` → `src/`
- `@@` → `src/common/`

### Directory Structure

```
src/
├── api/              # API layer - organized by business domain
│   ├── authority/        # User, role, menu, API management
│   ├── base/             # Login, casbin
│   ├── class/            # Class management
│   ├── course/           # Course, chapter, lesson, category
│   ├── document/         # Document management
│   ├── fileM/            # File upload (chunk upload)
│   ├── member/           # Teacher, student, senior teacher
│   ├── monitor/          # Operation logs
│   ├── organization/     # Organization management
│   ├── sysSet/           # System settings (dict)
│   └── sysTool/          # System tools (cron)
├── pinia/stores/     # Pinia stores
│   ├── user_n.ts         # Authentication & user info
│   ├── permission_n.ts   # Dynamic routes from backend
│   ├── app.ts            # UI state (sidebar, device)
│   ├── settings.ts       # Layout configuration
│   └── tags-view.ts      # Tab management
├── router/
│   ├── index_n.ts        # Main router with constant routes
│   ├── guard_n.ts        # Navigation guards (auth logic)
│   └── config.ts         # Router mode configuration
├── layouts/          # Layout system with multiple modes
│   ├── modes/            # LeftMode, TopMode, LeftTopMode
│   └── components/       # Sidebar, NavigationBar, TagsView, etc.
├── pages/            # Feature pages organized by domain
├── http/axios_n.ts   # Axios instance with interceptors
├── common/
│   ├── composables/  # Reusable composition functions (useTheme, usePagination_n, etc.)
│   ├── components/   # Shared UI components
│   └── utils/        # Utility functions
└── plugins/          # Vue plugin registrations
```

### Key Patterns

**File Naming Convention**: Files ending in `_n` indicate "new" refactored versions, `_m` indicates "modified" versions.

**Dynamic Routing**: Routes are loaded from backend API (`/user/getMenus`) and merged at runtime via `permission_n.ts` store.

**API Layer**: Each API module exports typed functions using the shared axios instance. Response format:
```typescript
interface ApiResponseData<T> { code: number; data: T; msg: string }
// code === 0 means success
```

**State Persistence**: Layout settings auto-persist to localStorage via `watchEffect()` in stores.

**Outside-Store Access**: Use `useXXXStoreOutside()` functions for store access outside Vue setup context.

**Global Types**: Common interfaces defined in `types/api.d.ts`:
- `ApiResponseData<T>` - Standard API response wrapper
- `PageInfo` - Pagination params (`page`, `pageSize`)
- `ListData<T>` - Paginated list response (`list`, `total`, `page`, `pageSize`)
- `BaseModel` - Entity base fields (`id`, `createdAt`, `updatedAt`, `deletedAt`)
- `CId` / `CIds` - Single/multiple ID params

### Code Style (ESLint)

- Double quotes for strings
- No semicolons
- 2-space indentation
- Vue SFC block order: `<script>`, `<template>`, `<style>`
- 1tbs brace style

### Build Notes

- Console.log and debugger statements are stripped in production builds
- Chunks split: vue/vue-router/pinia, element-plus, vxe-table
- SVG icons auto-generate sprite from `src/common/assets/icons/`
- Vue/Pinia/Router APIs auto-imported (no manual imports needed)

## 安全规则（旁路模式下也必须遵守）

- 不修改 package.json 中的 dependencies
- 不删除 migrations/ 目录下的文件
- 不执行 rm -rf 命令
- 不修改 .env 文件



<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## 团队代码共识
- 时间戳转化统一按秒格式化处理（后端返回秒级时间戳，前端需 `* 1000` 转毫秒后再用 dayjs 格式化）
- 使用 `@@/utils/datetime` 中的 `formatDateTime()` 函数处理时间显示
- 涉及到新增，编辑，提交等交互考虑弱网情况下loading

# 代码复用
**IMPORTANT: 禁止重复实现已有功能**
- 相同代码出现 2 次 → 必须提取为公共函数
- 超过 10 行的业务逻辑 → 考虑复用
- 简单条件判断 → 不必过度抽象
- 新建文件前 → 先搜索是否已有类似功能
- 公共模块禁止依赖业务模块，避免循环依赖

# 代码健壮性
## 错误处理
- 异步操作必须有错误处理机制
- 错误分类处理:
    - 验证错误 → 返回字段级详情
    - 业务错误 → 返回用户友好提示
    - 系统错误 → 记录日志，返回通用错误
- 错误向上传播时补充上下文信息

## 输入验证
- 所有外部输入必须验证 (API 参数、用户输入、文件内容)
- 使用成熟的验证库
- 验证失败返回明确错误信息

## 边界检查
- 集合/数组访问前检查索引边界
- 除法前检查除数非零
- 空值检查 (null/undefined/nil/None)
- 类型转换前验证数据有效性
- 资源申请后确保释放 (连接、文件句柄、锁等)

# 修改原则
**IMPORTANT: 根本解决问题**
- 找到 root cause，从根本上解决
- 正面面对问题，不绕过不回避
- 复杂问题先说明根本原因，再讨论方案
- 禁止打补丁、用 hack、投机取巧
- 禁止因为“能跑”就不深究

## 代码清理
- 废弃代码: 确认无引用 → 直接删除
- 重复实现: 统一为一个 → 删除其余
- 死代码: 注释代码块、未使用的变量/函数 → 删除
- 历史遗留: 开发阶段大胆重构，不背历史包袱
- 不保留“以防万一”的代码

## 修改范围
- 只改必要文件，不顺便改无关代码
- 修改前先理解现有代码意图
- 修改后运行相关测试确认无回归

## 兼容性
- 仅对外发布的 API/SDK 需考虑向后兼容
- 内部开发阶段: 该改就改，该删就删

# 配置管理
- 敏感信息: 环境变量注入，禁止硬编码
- 优先级: 环境变量 > 配置文件 > 默认值

# 文档与注释
- 公共函数/方法: 文档注释说明参数、返回值、异常
- 业务逻辑: 注释说明“为什么”而非“做什么”
- 复杂算法: 注释解释核心思路
- 代码变更: 同步更新相关文档

# 禁止事项
- 硬编码密钥、密码、敏感信息
- 提交调试输出语句到代码库
- 单文件单独建文件夹
- 公共模块依赖业务模块
- 用错误处理吞掉异常假装没问题
- 用条件判断绕过 bug 而不修复
- 复制粘贴已有代码而不复用
- 保留“以防万一”的废弃代码
- 删除或跳过失败的测试来让构建通过

# AI 协作协议
## 解决问题
- 遇到问题: 先分析根本原因，再提出方案
- 不接受: “先这样绕过”、“加个判断跳过”
- 复杂修复: 说明根本原因，等待确认后再动手

## 代码质量
- 发现重复代码: 主动指出并提议合并
- 发现死代码: 主动指出并建议删除
- 发现设计问题: 指出问题本质，提供重构建议

## 工作方式
- 不确定时: 询问确认，不要猜测
- 修改前: 先阅读理解现有代码
- 修改后: 说明改了什么、为什么改
- 发现无关问题: 指出但不“顺便”修复
- 学到项目新知识时: 发现值得记录的规范、命令、模式或坑点，主动提议更新 CLAUDE.md，需用户确认后才执行

## 交付标准
- 完整实现需求，不做简化版/演示版
- 不遗留 TODO 或“后续可以扩展”
- 代码可直接运行，不需要人工补充

## 验证方式
- 完成前必须验证: 运行测试/检查，确认无错误
- 验证失败时: 查看错误、修复、重新验证，循环直到通过
- 不要假设正确: 能验证的就验证，不要说“应该没问题”
- 新代码: 确认有对应测试
- 修改代码: 运行相关测试
- 删除代码: 确认无引用


## TypeScript 项目
- 启用 strict 模式
- 禁止 any，使用 unknown + 类型守卫
- 禁止 @ts-ignore
- 使用 ES modules (import/export)



