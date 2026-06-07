# BestLNG

BestLNG 是一个开源、本地优先的语言学习项目，第一阶段目标是完成桌面客户端。

核心学习模式是“句子挖空 + 翻译提示 + 输入答案 + 错题复习”。用户可以基于公开词库、
句库或后续自定义内容包进行练习，逐步沉淀单词本和复习计划。

## 当前状态

项目已经具备本地自用 v1 的基础能力：Tauri 2 桌面端可以启动真实 Windows 桌面程序，
内置 CC0 示例内容包，支持句子挖空练习、答案判定、错题记录、单词本、基础统计、
用户设置和 SQLite 本地持久化。官网发布页已放在 `apps/site`，用于后续下载入口和版本说明。

后续开发必须先阅读：

- `AGENTS.md`
- `docs/TASK_PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

## 常用开发命令

- `pnpm desktop:dev`
- `pnpm desktop:build`
- `pnpm desktop:tauri`
- `pnpm --filter @bestlng/desktop exec tauri build --no-bundle`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm format`
- `pnpm format:check`

## 初始技术方向

- 桌面客户端：Tauri 2 + React + TypeScript + Vite。
- 本地数据：SQLite。
- 包管理：pnpm workspace。
- 发布页：Astro 或 Vite 静态站点。
- 版本更新：GitHub Releases + Tauri updater。
