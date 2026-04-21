# Project Context

## Purpose

**td27-admin** is a Vue 3 admin dashboard for an educational management system. It provides management interfaces for:

- Courses and course content
- Classes and class assignments
- Members (students, teachers, administrators)
- Authority and permission management
- Organization (institution) management

## Tech Stack

- **Framework**: Vue 3.5 with Composition API
- **Language**: TypeScript 5.8
- **Build Tool**: Vite 7
- **UI Library**: Element Plus 2.10
- **State Management**: Pinia 3
- **Router**: Vue Router 4
- **HTTP Client**: Axios
- **Table Component**: VXE Table 4.6
- **Rich Text Editor**: Vue Quill
- **CSS**: UnoCSS, Sass
- **Linting**: ESLint with @antfu/eslint-config

## Project Conventions

### Code Style

- **Quotes**: Double quotes for strings
- **Semicolons**: None (no semicolons)
- **Indentation**: 2 spaces
- **Brace style**: 1tbs (one true brace style)
- **Vue SFC order**: `<script>`, `<template>`, `<style>`
- **Auto-imports**: Vue, Pinia, and Router APIs are auto-imported (no manual imports needed)

### File Naming

- `_n` suffix: Indicates "new" refactored version (e.g., `user_n.ts`)
- `_m` suffix: Indicates "modified" version
- API files: One file per resource in `src/api/` (e.g., `course.ts`, `user.ts`)

### Path Aliases

- `@` → `src/`
- `@@` → `src/common/`

### Architecture Patterns

- **API Layer**: Each module exports typed functions using shared Axios instance
- **Response Format**: `{ code: number; data: T; msg: string }` where `code === 0` means success
- **Dynamic Routing**: Routes loaded from backend API (`/user/getMenus`) via `permission_n.ts` store
- **State Persistence**: Layout settings auto-persist to localStorage via `watchEffect()`
- **Outside-Store Access**: Use `useXXXStoreOutside()` for store access outside Vue setup context

### Directory Structure

```
src/
├── api/              # API layer - one file per resource
├── pinia/stores/     # Pinia stores (user_n, permission_n, app, settings, tags-view)
├── router/           # Router config, guards, constants
├── layouts/          # Layout system (LeftMode, TopMode, LeftTopMode)
├── pages/            # Feature pages by domain
├── http/             # Axios instance with interceptors
├── common/
│   ├── composables/  # Reusable composition functions
│   ├── components/   # Shared UI components
│   └── utils/        # Utility functions
└── plugins/          # Vue plugin registrations
```

### Testing Strategy

- No formal test suite currently configured
- Manual testing via development server
- Type checking via `vue-tsc` during build

### Git Workflow

- **Main branch**: `main` (production-ready code)
- **Development branch**: `dev` (current working branch)
- **Commit message language**: Chinese (based on recent commits)
- **Pre-commit hooks**: ESLint via Husky + lint-staged

## Domain Context

This is an educational platform admin system (教育管理系统). Key domain concepts:

- **课程 (Courses)**: Educational content and curriculum
- **班级 (Classes)**: Student groupings associated with institutions
- **人员 (Members)**: Users with roles (students, teachers, admins)
- **机构 (Institutions/Organizations)**: Schools or educational bodies
- **权限 (Permissions)**: Role-based access control

## Important Constraints

- Backend API is required (Go-based td27-admin backend)
- API version: V2 (recently upgraded)
- Console.log and debugger statements are stripped in production builds
- SVG icons auto-generate sprite from `src/common/assets/icons/`

## External Dependencies

- **Backend API**: td27-admin Go backend service
- **Authentication**: JWT-based authentication via backend
- **Menu/Routes**: Dynamically fetched from `/user/getMenus` endpoint
