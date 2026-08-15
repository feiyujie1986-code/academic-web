# Repository Guidelines

## Project Structure & Module Organization

This is a Vue 3 and TypeScript administration app built with Vite. Feature screens are grouped by domain under `src/pages/`, matching API clients live in `src/api/`, shared UI and utilities are in `src/common/`, and state is in `src/pinia/stores/`. Routing is under `src/router/`; layouts are in `src/layouts/`. Static files belong in `public/`, imported assets in `src/assets/` or `src/common/assets/`, and declarations in `types/`. Specifications live in `openspec/`; read `openspec/AGENTS.md` before substantial architectural changes.

## Build, Test, and Development Commands

Use pnpm and keep `pnpm-lock.yaml` synchronized.

- `pnpm install` installs dependencies.
- `pnpm dev` starts the Vite development server.
- `pnpm build` runs `vue-tsc` and creates a production build.
- `pnpm build:staging` builds with the staging environment.
- `pnpm preview` serves the production bundle locally.
- `pnpm lint` runs ESLint with automatic fixes.
- `pnpm test` currently reports that no tests are configured.

## Coding Style & Naming Conventions

Follow `eslint.config.js`: use 2-space indentation, double quotes, no semicolons, no dangling commas, and 1TBS braces. In Vue SFCs, order blocks as `<script>`, `<template>`, then `<style>`. Use PascalCase for reusable Vue components, `useXxx` for composables, and domain-oriented names for API modules and pages. Existing `_n` and `_m` suffixes denote refactored and modified variants; preserve them where extending those modules. Prefer the `@` alias for `src/` and `@@` for `src/common/`. Search for reusable logic before adding new helpers.

## Testing Guidelines

There is no automated test framework or coverage threshold yet. For every change, run `pnpm build` and `pnpm lint`, then manually verify affected routes, API error states, loading states, and responsive layouts. If introducing tests, colocate them as `*.spec.ts` near the implementation and add a documented test runner script.

## Commit & Pull Request Guidelines

History follows Conventional Commit prefixes, especially `feat:` and `fix:` (for example, `fix: correct activity timezone handling`). Keep commits focused with an imperative summary. Pull requests should explain the solution, list verification steps, link issues or OpenSpec changes, and include screenshots for UI changes. Call out configuration, API-contract, permission, or migration impacts.

## Security & Configuration

Do not commit secrets or modify `.env` files casually. Validate external input, handle asynchronous failures with user-friendly messages, and preserve existing role and API permission checks. Avoid changing dependencies unless the task requires it.
