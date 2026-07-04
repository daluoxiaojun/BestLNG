# BestLNG 阶段开发日志

> 日志规则：每次完成开发前，先读取本文件，确认最后一个日志序号。
> 新日志必须追加在文件末尾，不允许覆盖、重写或删除既有日志。

## 1. 初始化长期协作规范

本阶段创建了项目长期协作所需的三个基础文件：

- `AGENTS.md`
- `docs/TASK_PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

`AGENTS.md` 用来约束后续 AI 和开发者的长期行为，包括项目定位、推荐技术栈、
任务执行规则、中文注释要求、验证要求、日志追加规则和 Git 安全规则。

`docs/TASK_PLAN.md` 用来记录长期任务清单，并已将“创建长期约束、任务清单、开发日志”
这一项标记为完成。后续任务应从第一个未完成项继续。

`docs/DEVELOPMENT_LOG.md` 用来保存阶段开发日志。本日志为第 1 条记录，
后续新增日志必须继续按序号追加。

验证情况：本阶段只新增文档文件，项目尚未初始化 package、lint、typecheck、test 或
Tauri/Rust 配置，因此未运行自动化验证命令。

下一步建议：从 `docs/TASK_PLAN.md` 的第一个未完成任务开始，初始化 Git 仓库、
pnpm workspace 和基础目录结构。

## 2. 初始化仓库与 pnpm 工作区

本阶段完成了本地 Git 仓库和 pnpm workspace 的初步初始化。

新增或更新的主要内容：

- 初始化本地 Git 仓库，当前分支为 `main`。
- 新增 `.gitignore`，覆盖 Node、pnpm、Tauri/Rust、环境变量、日志和编辑器临时文件。
- 新增 `README.md`，记录项目定位、当前状态和初始技术方向。
- 新增根目录 `package.json` 与 `pnpm-workspace.yaml`，声明 pnpm workspace。
- 新增 `apps/desktop`、`apps/site`、`packages/core`、`packages/content`、`packages/ui`
  的基础目录和 package 占位文件。
- 生成 `pnpm-lock.yaml`，锁定当前 workspace 初始状态。
- 更新 `docs/TASK_PLAN.md`，将“初始化 Git 仓库、pnpm workspace、基础目录结构”
  标记为完成。

环境确认：

- Git 可用，当前仓库已初始化。
- GitHub CLI 已登录账号 `daluoxiaojun`，但本阶段没有创建远程仓库，也没有推送代码。
- Node 版本为 v22.20.0。
- pnpm 版本为 10.17.1。

验证情况：

- 已运行 `pnpm install --lockfile-only`，成功生成锁文件。
- 已运行 `pnpm list -r --depth -1`，确认识别到 6 个 workspace 项目。
- 已运行 `git status --short --branch`，确认当前处于 `main` 分支且文件尚未提交。
- 本阶段尚未运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`，因为对应脚本和工具链还未配置；
  这正是任务清单中的下一项。

下一步建议：继续执行 `docs/TASK_PLAN.md` 中的第一个未完成任务，配置基础开发脚本：
lint、typecheck、test、format。

## 3. 配置基础开发脚本与代码规范

本阶段完成了基础代码质量工具链配置，让项目进入“可以统一检查”的状态。

新增或更新的主要内容：

- 在根目录 `package.json` 中新增 `lint`、`typecheck`、`test`、`format`、`format:check`
  脚本。
- 安装开发依赖：TypeScript、ESLint、typescript-eslint、Prettier、Vitest、Node 类型定义。
- 新增 `.editorconfig`，统一编码、换行、缩进和尾随空白规则。
- 新增 `.prettierrc.json` 与 `.prettierignore`，统一格式化规则并忽略生成产物。
- 新增 `eslint.config.js`，采用 ESLint flat config，并对 TypeScript 启用基础推荐规则。
- 新增 `tsconfig.base.json` 和 `tsconfig.json`，开启严格 TypeScript 基础配置。
- 更新 `README.md`，补充当前状态和常用开发命令。
- 更新 `docs/TASK_PLAN.md`，将基础脚本和基础规范配置两项标记为完成。

验证情况：

- 已运行 `pnpm format`，格式化检查范围内的项目文件。
- 已运行 `pnpm lint`，ESLint 检查通过。
- 已运行 `pnpm typecheck`，TypeScript 类型检查通过。
- 已运行 `pnpm test`，Vitest 在当前暂无测试文件的情况下通过。
- 已运行 `pnpm format:check`，Prettier 格式检查通过。

遗留问题：

- 当前还没有真实业务代码和测试用例，`pnpm test` 依赖 Vitest 的无测试通过模式。
- 后续搭建桌面端骨架后，需要为 React/Tauri 应用补充更具体的 lint、typecheck 和测试覆盖。

下一步建议：继续执行 `docs/TASK_PLAN.md` 中的第一个未完成任务，搭建 Tauri 2 +
React + TypeScript 桌面端骨架。

## 4. 搭建桌面端基础骨架

本阶段完成了 BestLNG 桌面端的 Tauri 2 + React + TypeScript + Vite 基础骨架。

新增或更新的主要内容：

- 为 `@bestlng/desktop` 安装 React、React DOM、Vite、Tauri CLI、Tauri API 和相关类型依赖。
- 在根目录 `package.json` 中新增 `desktop:dev`、`desktop:build`、`desktop:tauri` 脚本。
- 在 `apps/desktop/package.json` 中新增 `dev`、`build`、`preview`、`typecheck`、
  `tauri:dev`、`tauri:build` 等桌面端脚本。
- 新增 Vite 入口文件、React 入口、桌面端首页骨架和基础 CSS。
- 新增 `apps/desktop/src-tauri`，包含 Tauri 配置、Rust 入口、build 脚本和默认权限配置。
- 更新 ESLint 配置，补充浏览器和 Node 全局变量，避免桌面端前端文件误报。
- 更新 `README.md` 和 `apps/desktop/README.md`，补充桌面端常用命令。
- 更新 `docs/TASK_PLAN.md`，将“搭建 Tauri 2 + React + TypeScript 桌面端骨架”
  标记为完成。

验证情况：

- 已运行 `pnpm format`，格式化项目文件。
- 已运行 `pnpm lint`，ESLint 检查通过。
- 已运行 `pnpm typecheck`，桌面端 TypeScript 检查通过。
- 已运行 `pnpm test`，Vitest 在当前暂无测试文件的情况下通过。
- 已运行 `pnpm desktop:build`，桌面端 Vite 生产构建通过。
- 已运行 `pnpm format:check`，Prettier 格式检查通过。
- 已运行 `pnpm --filter @bestlng/desktop exec tauri --version`，确认 Tauri CLI 版本为 2.11.2。

遗留问题：

- 当前系统没有安装 Rust/Cargo，`cargo --version` 不可用，因此本阶段无法运行 `cargo test`
  或真正执行 `tauri build`。
- 当前桌面端只完成工程骨架和简单启动界面，任务清单中的基础页面结构、路由、布局和主题规范
  仍未完成。

下一步建议：继续执行 `docs/TASK_PLAN.md` 中的第一个未完成任务，设计基础页面结构：
今日练习、句子填空、单词本、内容包、统计、设置。

## 8. 实现本地数据备份恢复

本阶段继续推进本地自用第一版，完成了 SQLite 学习数据的版本化 JSON 备份与恢复能力。

新增或更新的主要内容：

- 桌面端新增 Tauri `dialog` 和 `fs` 插件，用于选择备份文件路径并读写本地 JSON 文件。
- 在仓储层新增 `exportLearningBackup` 和 `importLearningBackup` 公共 API。
- 备份文件包含 `appId`、`schemaVersion`、`exportedAt` 和核心数据表快照，当前版本为
  `schemaVersion: 1`。
- 恢复时会校验备份归属和版本号，再按外键依赖顺序清空并写回内容包、句子、空位、词条、
  练习记录、复习队列和设置。
- 设置页开放“导出本地数据”和“恢复备份”按钮，恢复成功后刷新当前工作台状态。
- 更新 `docs/TASK_PLAN.md`，将“实现数据备份、恢复和版本兼容策略”标记为完成。

主要修改或新增文件：

- `apps/desktop/package.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/capabilities/default.json`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/storage/repository.ts`
- `apps/desktop/src/storage/types.ts`
- `apps/desktop/src/styles.css`
- `pnpm-lock.yaml`
- `docs/TASK_PLAN.md`

验证情况：

- 已运行 `pnpm format`，格式化项目文件。
- 已运行 `pnpm lint`，ESLint 检查通过。
- 已运行 `pnpm typecheck`，递归类型检查通过。
- 已运行 `pnpm test`，2 个测试文件、9 条用例通过。
- 已运行 `pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，Tauri 原生层测试通过。
- 已运行 `pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，release 构建通过，并生成
  `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。

遗留问题：

- 备份恢复当前采用整库替换策略，第一版本地自用足够直接；后续如果增加云同步或多设备合并，
  需要再设计增量合并策略。
- `docs/DEVELOPMENT_LOG.md` 历史上存在第 7 条早于第 6、第 5 条的乱序记录；本阶段遵守追加规则，
  未重写旧日志，只在末尾继续追加第 8 条。

下一步建议：继续执行任务清单中的第一个未完成任务，支持 CSV、JSON 等基础格式导入。

## 9. 支持 CSV 与 JSON 内容包导入

本阶段补齐本地自用第一版里非常关键的内容来源能力，让用户可以把自己的句子和词导入到桌面端。

新增或更新的主要内容：

- `packages/content` 新增导入解析器，支持完整 JSON 内容包和带表头 CSV。
- JSON 导入复用既有 `ContentPackage` schema，并继续执行许可证、作者、句子和挖空字段校验。
- CSV 导入支持 `text`、`translation`、`answer` 必填字段，以及 `id`、`hint`、
  `accepted_answers`、`tags` 可选字段；多值字段使用 `|` 分隔。
- CSV 导入会生成许可证明确的用户内容包，默认标注为 `User Provided`，提醒用户自行确认来源权利。
- 桌面端内容包页的“选择本地文件”按钮改为真实可用，支持选择 `.csv` 和 `.json` 文件。
- 导入成功后写入 SQLite 内容包、句子、挖空配置和初始词条，并刷新当前工作台状态。
- 新增内容包导入测试，将测试数量从 9 条提升到 11 条。
- 更新 `docs/TASK_PLAN.md`，将“支持 CSV、JSON 等基础格式导入”标记为完成。

主要修改或新增文件：

- `packages/content/src/importers.ts`
- `packages/content/src/index.ts`
- `packages/content/src/content.test.ts`
- `apps/desktop/src/storage/repository.ts`
- `apps/desktop/src/storage/types.ts`
- `apps/desktop/src/App.tsx`
- `docs/TASK_PLAN.md`

验证情况：

- 已运行 `pnpm format`，格式化项目文件。
- 已运行 `pnpm typecheck`，递归类型检查通过。
- 已运行 `pnpm lint`，ESLint 检查通过。
- 已运行 `pnpm test`，2 个测试文件、11 条用例通过。
- 已运行 `pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，Tauri 原生层测试通过。
- 已运行 `pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，release 构建通过，并生成
  `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。

遗留问题：

- CSV 导入的语言、许可证和作者信息当前使用第一版默认值，后续可以在导入前增加元数据确认表单。
- 当前导入会把 CSV 文件作为新内容包导入，不做重复内容智能合并；第一版本地自用足够稳定。

下一步建议：继续执行任务清单中的第一个未完成任务，实现今日复习、复习结果记录和下次复习时间计算。

## 10. 实现今日复习与下次复习计算

本阶段补齐单词本复习闭环，让到期词条可以直接在桌面端记录复习结果，并自动安排下一次复习。

新增或更新的主要内容：

- 桌面端仓储层新增 `reviewVocabularyEntry` 公共 API。
- 复用 `packages/core` 中已有的 `scheduleNextReview` 调度逻辑，支持 `again`、`hard`、
  `good`、`easy` 四档评分。
- 记录复习结果时会更新 `review_queue` 的到期时间、间隔天数、易度因子、重复次数和遗忘次数。
- 同步更新 `vocabulary_entries` 的 `status`、`next_review_at`、`due_count` 和 `updated_at`。
- 单词本页对到期词条显示“再来 / 困难 / 记住 / 简单”按钮，点击后刷新工作台状态。
- 增加复习按钮的桌面与移动端布局样式，避免词条行在小屏幕下挤压。
- 更新 `docs/TASK_PLAN.md`，将“实现今日复习、复习结果记录和下次复习时间计算”标记为完成。

主要修改文件：

- `apps/desktop/src/storage/repository.ts`
- `apps/desktop/src/storage/types.ts`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/styles.css`
- `docs/TASK_PLAN.md`

验证情况：

- 已运行 `pnpm format`，格式化项目文件。
- 已运行 `pnpm typecheck`，递归类型检查通过。
- 已运行 `pnpm lint`，ESLint 检查通过。
- 已运行 `pnpm test`，2 个测试文件、11 条用例通过。
- 已运行 `pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，Tauri 原生层测试通过。
- 已运行 `pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，release 构建通过，并生成
  `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。

遗留问题：

- 当前复习结果记录没有单独的历史明细表，只更新当前队列状态；第一版本地自用已能完成复习安排，
  后续若要统计复习质量曲线，可以新增 `review_attempts` 表。
- 当前复习入口在单词本页，到期词也会在今日页展示；后续可把评分按钮也放进今日页复习队列。

下一步建议：继续执行任务清单中的第一个未完成任务，实现学习统计、设置、数据导入导出这一组的清单归档，
或先为第一版补充根目录 `LICENSE` 和 GitHub Release 安装包。

## 11. 归档学习统计、设置与数据导入导出任务

本阶段没有新增业务代码，主要根据当前实现状态同步长期任务清单。

归档依据：

- 学习统计已在桌面端展示练习数量、正确率、连续学习天数、薄弱词汇和最近七天练习量。
- 设置页已支持每日目标、答案严格度、自动加入错词复习队列、仅启用许可证确认内容包等偏好保存。
- 数据导出与恢复已通过版本化 JSON 备份实现。
- 内容包导入已支持 CSV 和 JSON 文件。

主要修改文件：

- `docs/TASK_PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

验证情况：

- 本阶段只更新文档清单和日志；在归档前，上一阶段已完成 `pnpm format:check`、`pnpm lint`、
  `pnpm typecheck`、`pnpm test`、`pnpm desktop:build`、`cargo test` 和 Tauri release 构建。
- 本阶段仍会在提交前运行 `pnpm format:check`，确认文档格式符合 Prettier。

遗留问题：

- 后续发布相关任务仍未完成，包括 Cloudflare Pages、GitHub Releases、Tauri updater 和 GitHub Actions。
- 这些任务属于分发与更新能力，不影响当前桌面端本地自用第一版。

下一步建议：如继续推进分发体验，优先补根目录 `LICENSE`，再配置 GitHub Releases 和 Tauri updater。

## 7. 接入本地数据层与本地自用 v1 闭环

本阶段在 subagent 协作下，把 BestLNG 从静态桌面工作台推进到可本地自用的 v1 基础闭环。

新增或更新的主要内容：

- 桌面端接入 `@tauri-apps/plugin-sql`，在 Tauri 原生层注册 SQLite 插件和迁移。
- 新增 SQLite 核心表：内容包、句子、空位、词条、练习记录、复习队列、应用设置。
- 新增桌面端本地仓储层，首次启动写入内置 CC0 示例内容包。
- 桌面端页面从静态数据改为数据驱动，支持句子挖空、答案判定、错题记录、单词本、基础统计和设置保存。
- 新增 Hash 路由、主题变量、跳转链接、屏幕阅读器状态、禁用态和更明确的焦点样式。
- `packages/core` 实现答案归一化、挖空题创建与判分、简化复习调度、学习统计聚合。
- `packages/content` 实现内容包类型、许可证校验、示例内容包和内容包到练习输入的转换。
- `apps/site` 建立中文静态发布页和下载入口骨架。
- 根目录 `typecheck` 改为递归执行所有 workspace 中已有的 typecheck 脚本。
- 更新 `README.md` 和 `apps/desktop/README.md`，记录当前本地自用 v1 能力。
- 更新 `docs/TASK_PLAN.md`，将已实际完成并验证的任务标记为完成，保留尚未完成的备份恢复、
  CSV/JSON 导入、Cloudflare 部署、GitHub Releases/updater 等后续任务。

主要修改或新增文件：

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/app/navigation.ts`
- `apps/desktop/src/app/usePageRouter.ts`
- `apps/desktop/src/storage/repository.ts`
- `apps/desktop/src/storage/seed.ts`
- `apps/desktop/src/storage/types.ts`
- `apps/desktop/src/styles.css`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/capabilities/default.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `packages/core/src/**`
- `packages/content/src/**`
- `apps/site/**`
- `package.json`
- `README.md`
- `apps/desktop/README.md`
- `docs/TASK_PLAN.md`

验证情况：

- 已运行 `pnpm format:check`，格式检查通过。
- 已运行 `pnpm lint`，ESLint 检查通过。
- 已运行 `pnpm typecheck`，递归覆盖 `packages/content`、`packages/core` 和 `apps/desktop`，类型检查通过。
- 已运行 `pnpm test`，2 个测试文件、9 条用例通过。
- 已运行 `pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，Tauri 原生层测试通过。
- 已运行 `tauri build --no-bundle`，release 构建通过，并生成
  `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。
- 已直接启动 release 版 `bestlng-desktop.exe`，确认真实桌面程序进程可以启动。

遗留问题：

- 当前导入导出入口仍是预留状态，尚未实现 CSV/JSON 导入和本地数据备份恢复。
- 当前复习调度是简化等价逻辑，不是完整 FSRS 参数模型；后续可以替换为正式 FSRS。
- 官网发布页已有骨架，但正式下载链接、安装包、GitHub Releases、Tauri updater 和 Cloudflare
  Pages 部署仍未完成。
- 当前图标仍是临时占位图标，后续需要替换正式品牌图标。

下一步建议：提交当前本地自用 v1 基础版本，创建 GitHub 远程仓库并推送第一版；随后继续实现
数据备份恢复、CSV/JSON 导入、安装包发布和 updater。

## 6. 实现桌面端基础页面结构

本阶段在 subagent 协作下，把桌面端从单一骨架页推进为基础学习工作台。

新增或更新的主要内容：

- 在 `apps/desktop/src/App.tsx` 中实现 6 个基础页面：今日练习、句子填空、单词本、
  内容包、统计、设置。
- 使用本地 React state 完成页面切换，当前没有引入路由依赖。
- 为导航按钮补充 `aria-current` 状态，保留键盘焦点样式。
- 在 `apps/desktop/src/styles.css` 中补充侧边栏、工作区、指标卡、练习区、表单、
  图表和响应式布局样式。
- 调整界面文案，移除面向开发者的“后续接入”类可见提示，让界面更像实际产品。
- 更新 `README.md`，记录当前已具备基础学习工作台页面结构。
- 更新 `docs/TASK_PLAN.md`，将“设计基础页面结构：今日练习、句子填空、单词本、内容包、
  统计、设置”标记为完成。

验证情况：

- subagent 已运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm desktop:build`，均通过。
- 主线程已再次运行 `pnpm format:check`，格式检查通过。
- 主线程已再次运行 `pnpm lint`，ESLint 检查通过。
- 主线程已再次运行 `pnpm typecheck`，桌面端 TypeScript 检查通过。
- 主线程已再次运行 `pnpm test`，Vitest 在当前暂无测试文件的情况下通过。
- 主线程已再次运行 `pnpm desktop:build`，桌面端 Vite 构建通过。
- 主线程已再次运行 `pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，
  Tauri release 构建通过。
- 已启动最新 release 版 `bestlng-desktop.exe`，确认桌面进程正在运行。

遗留问题：

- 页面当前仍使用静态示例数据，尚未接入 SQLite、本地持久化和真实练习流程。
- 当前页面切换使用 React state，任务清单中的基础路由、布局、主题和可访问性规范仍未完成。
- 当前测试仍是无测试文件通过模式，后续需要为核心交互补充真实测试。

下一步建议：继续执行 `docs/TASK_PLAN.md` 中的第一个未完成任务，建立基础路由、布局、
主题和可访问性规范。

补充验证：已运行 `pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，
Tauri release 构建通过，并生成桌面程序：
`apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。

补充验证：已直接启动 release 版 `bestlng-desktop.exe`，确认桌面进程正在运行，
窗口标题为 `BestLNG`。

补充验证：阶段收尾时已启动 `pnpm --filter @bestlng/desktop dev`，本地
`http://127.0.0.1:1420` 返回 HTTP 200，可用于预览当前桌面端前端骨架。

## 5. 修复 Tauri 桌面运行环境

本阶段根据用户要求，把桌面端从“只能预览网页前端”推进到“可以启动真实 Tauri 桌面窗口”。

新增或更新的主要内容：

- 使用 winget 安装 Rustup，并补齐 Rust/Cargo 工具链。
- 确认本机已有 WebView2 Runtime 和 Visual Studio Build Tools 2022 MSVC 环境。
- 新增 `apps/desktop/src-tauri/icons` 临时图标资源，解决 Windows Tauri 构建资源缺少
  `icons/icon.ico` 的问题。
- 更新 `.gitignore` 和 `.prettierignore`，忽略 Tauri 自动生成的 `src-tauri/gen`
  和 `src-tauri/target` 目录。
- 更新 `docs/TASK_PLAN.md`，记录 Rust/Cargo 环境修复与桌面窗口启动验证已完成。

验证情况：

- 已运行 `rustup --version`，确认 Rustup 可用。
- 已运行 `rustc --version`，确认 Rust 编译器可用。
- 已运行 `cargo --version`，确认 Cargo 可用。
- 已运行 `pnpm --filter @bestlng/desktop exec tauri info`，确认 Tauri 环境中 WebView2、MSVC、
  Rust、Cargo、Rustup 全部通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，Tauri 原生层测试通过。
- 已运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm desktop:build`，前端质量检查与构建通过。
- 已启动 `pnpm desktop:tauri`，确认 `bestlng-desktop.exe` 进程正在运行，并且 Vite dev server
  监听 `127.0.0.1:1420`。

遗留问题：

- 当前图标是临时生成的占位图标，后续需要在品牌视觉确定后替换为正式图标。
- 当前桌面窗口仍是骨架界面，任务清单中的基础页面结构、路由、布局和主题规范仍未完成。

下一步建议：继续执行 `docs/TASK_PLAN.md` 中的第一个未完成任务，设计基础页面结构：
今日练习、句子填空、单词本、内容包、统计、设置。

## 12. 准备 Cloudflare Pages 部署配置

本阶段继续推进官网发布页部署任务。由于当前 Wrangler 登录态不可用，且非交互环境无法执行
`wrangler login`，本阶段没有完成真实 Cloudflare Pages 首次上线；但已补齐后续部署所需的
本地配置和脚本。

新增或更新的主要内容：

- 为 `@bestlng/site` 添加 Wrangler 开发依赖。
- 新增根目录 `site:preview` 和 `site:deploy` 脚本。
- 新增站点 `deploy` 脚本，使用 `wrangler pages deploy . --project-name bestlng` 发布静态页。
- 新增 `wrangler.toml`，声明 Cloudflare Pages 项目名和静态文件目录。
- 更新 `apps/site/README.md`，记录登录检查和部署命令。
- 更新 `docs/TASK_PLAN.md`，将 Cloudflare Pages 部署拆成配置准备和真实首次部署两个子任务。

主要修改或新增文件：

- `package.json`
- `apps/site/package.json`
- `pnpm-lock.yaml`
- `wrangler.toml`
- `apps/site/README.md`
- `docs/TASK_PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

验证情况：

- 已运行 `corepack pnpm dlx wrangler whoami`，确认 Wrangler 可用但当前未登录，无法在非交互环境
  继续真实部署。
- 已运行 `corepack pnpm format`，格式化项目文件。
- 已运行 `corepack pnpm lint`，ESLint 检查通过。
- 已运行 `corepack pnpm typecheck`，递归类型检查通过。
- 已运行 `corepack pnpm test`，2 个测试文件、11 条用例通过。
- 已运行 `corepack pnpm site:deploy`，部署脚本已正确调用 Wrangler；命令因缺少
  `CLOUDFLARE_API_TOKEN` 停止，未完成真实部署。

遗留问题：

- 需要用户在交互终端运行 `pnpm --filter @bestlng/site exec wrangler login`，或提供
  `CLOUDFLARE_API_TOKEN` 后，再执行 `pnpm site:deploy` 完成首次部署。
- 首次部署成功后，再把 `docs/TASK_PLAN.md` 中“部署到 Cloudflare Pages”及其首次部署子项标记为完成。

## 13. 修复桌面端 SQLite 初始化权限

本阶段根据验收反馈修复桌面端启动后提示“加载本地数据失败”的问题。浏览器预览可用，是因为浏览器
环境会使用内存预览数据；真实 Tauri 桌面端会连接 SQLite，并在首次启动时写入示例内容包。

问题原因：

- Tauri SQL 插件的 `sql:default` 权限只允许加载连接、关闭连接和查询。
- 桌面端初始化 SQLite 时需要执行 `INSERT` 写入示例内容包和默认设置。
- 缺少 `sql:allow-execute` 会导致初始化写入被权限系统拒绝。

主要修改文件：

- `apps/desktop/src-tauri/capabilities/default.json`
- `apps/desktop/src/App.tsx`
- `docs/DEVELOPMENT_LOG.md`

验证情况：

- 已运行 `corepack pnpm format`，格式化项目文件。
- 已运行 `corepack pnpm lint`，ESLint 检查通过。
- 已运行 `corepack pnpm typecheck`，递归类型检查通过。
- 已运行 `corepack pnpm test`，2 个测试文件、11 条用例通过。
- 已运行 `corepack pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，Tauri 原生层测试通过。
- 已运行 `corepack pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，release 构建通过，
  并生成 `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。

遗留问题：

- 需要重启正在运行的 Tauri 桌面端，让新的 capability 权限生效。

## 14. 生成四六级、雅思和托福考试内容包

本阶段根据用户要求，补充 4 个可直接导入 BestLNG 桌面端的考试词包。

新增或更新的主要内容：

- 新增考试内容包生成脚本 `packages/content/scripts/generate_exam_packs.py`。
- 从 ECDICT 读取 `cet4`、`cet6`、`ielts`、`toefl` 标签词条，保留词表、释义、考试标签和来源信息。
- 优先从 Tatoeba CC0 英文句子导出中匹配真实英文例句。
- Tatoeba 没有匹配到的词条使用 BestLNG 原创兜底例句，保证每个词都能形成挖空练习。
- 生成 4 个 JSON 内容包，可在桌面端“内容包”页面直接选择导入：
    - `packages/content/packs/exam/bestlng-cet4-en-zh.json`
    - `packages/content/packs/exam/bestlng-cet6-en-zh.json`
    - `packages/content/packs/exam/bestlng-ielts-en-zh.json`
    - `packages/content/packs/exam/bestlng-toefl-en-zh.json`
- 新增 `packages/content/packs/exam/README.md`，记录来源、许可证和生成统计。
- 更新 `packages/content/README.md` 和 `docs/TASK_PLAN.md`。
- 增加测试，确保生成的 4 个 JSON 内容包都能通过现有内容包 schema 校验和 JSON 导入解析。

生成结果：

- CET4：3846 条，其中 3399 条匹配 Tatoeba CC0 英文例句，447 条使用原创兜底例句。
- CET6：5406 条，其中 4355 条匹配 Tatoeba CC0 英文例句，1051 条使用原创兜底例句。
- IELTS：5038 条，其中 4007 条匹配 Tatoeba CC0 英文例句，1031 条使用原创兜底例句。
- TOEFL：6970 条，其中 4580 条匹配 Tatoeba CC0 英文例句，2390 条使用原创兜底例句。

验证情况：

- 已运行 `corepack pnpm format`，格式化项目文件。
- 已运行 `corepack pnpm lint`，ESLint 检查通过。
- 已运行 `corepack pnpm typecheck`，递归类型检查通过。
- 已运行 `corepack pnpm test`，2 个测试文件、12 条用例通过。
- 已运行 `corepack pnpm desktop:build`，桌面端 Vite 构建通过。

遗留问题：

- 当前中文侧使用 ECDICT 释义生成练习提示，不是逐句人工翻译；后续如果引入许可证明确的中文句对，
  可以替换成更自然的完整中文翻译。

## 15. 接入考试词包为桌面端默认内容

本阶段根据用户要求，将已生成的 CET4、CET6、IELTS、TOEFL 4 个考试词包接入桌面端默认内容。

新增或更新的主要内容：

- `apps/desktop/src/storage/seed.ts` 引入 4 个考试 JSON 内容包，并组成内置内容包列表。
- `apps/desktop/src/storage/repository.ts` 的初始化逻辑改为按内容包 id 检查并补齐缺失内置包。
- 已启动过旧版本的本地数据库也会在下次启动时自动补齐 4 个考试内容包，不再需要手动导入。
- 保留原有入门示例包作为第一个内置包。
- 更新 `docs/TASK_PLAN.md`，记录考试包已接入默认词本。

验证情况：

- 已运行 `corepack pnpm format`，格式化项目文件。
- 已运行 `corepack pnpm lint`，ESLint 检查通过。
- 已运行 `corepack pnpm typecheck`，递归类型检查通过。
- 已运行 `corepack pnpm test`，2 个测试文件、12 条用例通过。
- 已运行 `corepack pnpm desktop:build`，桌面端 Vite 构建通过。

遗留问题：

- 4 个考试包作为默认内容打入前端 bundle 后，桌面端主 JS 增大到约 9.7 MB，gzip 后约 2.3 MB。
  当前桌面端可接受；后续如果追求更小首包，可以把内置内容包改为懒加载静态资源。
- 需要重启正在运行的 Tauri 桌面端，让新的默认内容 seed 逻辑生效。

## 16. 修复考试词本初始化并补充官网展示

本阶段根据用户验收截图修复桌面端启动时报
`cannot rollback - no transaction is active` 的问题，并补齐官网发布页对新增词本的展示。

问题原因：

- 前端通过 Tauri SQL 插件连续执行 `BEGIN / INSERT / COMMIT / ROLLBACK`，大批量写入时可能被底层
  SQL 连接池分配到不同连接，失败后无条件 `ROLLBACK` 又覆盖了真实错误。
- 官网发布页是纯静态 HTML，之前不会自动读取 `packages/content/packs`，所以页面上看不到新增词本。

新增或更新的主要内容：

- 桌面端新增原生命令 `upsert_content_package`，使用 Rust `sqlx` 单连接事务写入内容包、句子、
  空位和初始词条，避免跨调用事务失效。
- 前端仓储层改为先复用内容包 schema 校验，再把内置包或用户导入包交给原生命令写库。
- SQLite 初始化会按每个内置内容包的句子数判断是否需要补齐；旧数据库只有入门包时，下次启动会自动补齐
  CET4、CET6、IELTS、TOEFL。
- 内容包页增加句子数展示，浏览器预览模式也会展示 5 个内置内容包。
- 错题复习队列修复同一单词跨多个考试包时的词条 id 查找，避免按空位 id 假设词条必然存在。
- 官网发布页新增“内置考试词本”区块，展示 4 个考试词本的词条数、Tatoeba 例句数、原创兜底数和来源说明。
- 新增 Rust 单元测试，确认前端传入的 camelCase 内容包 payload 可以正确反序列化。

主要修改或新增文件：

- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/storage/repository.ts`
- `apps/desktop/src/storage/seed.ts`
- `apps/desktop/src/storage/types.ts`
- `apps/site/index.html`
- `apps/site/styles.css`
- `docs/TASK_PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

验证情况：

- 已运行 `corepack pnpm format`，格式化项目文件。
- 已运行 `corepack pnpm format:check`，格式检查通过。
- 已运行 `corepack pnpm lint`，ESLint 检查通过。
- 已运行 `corepack pnpm typecheck`，递归类型检查通过。
- 已运行 `corepack pnpm test`，2 个测试文件、12 条用例通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，原生层 1 条测试通过。
- 已运行 `corepack pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `corepack pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，release 构建通过，并生成
  `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。
- 已启动 release 版桌面端并查询真实 SQLite 数据库，确认旧库从 1 个入门包自动补齐到 5 个内容包：
    - 入门包 8 句
    - CET4 3846 句
    - CET6 5406 句
    - IELTS 5038 句
    - TOEFL 6970 句
    - 总句子数 21268，去重词条数 10573

遗留问题：

- 4 个考试包仍然直接打入前端 bundle，生产构建主 JS 约 9.7 MB，gzip 后约 2.3 MB；当前可用，
  后续如果要优化启动体积，可以把内置包改为 Tauri resource 或懒加载静态资源。
- 官网发布页本地内容已更新，但 Cloudflare Pages 首次真实部署仍需要 Cloudflare 登录态或 API Token。

## 17. 支持按当前词本分类学习

本阶段根据用户反馈修正学习范围：之前内置词本和导入词本都进入同一套练习数据，体验上像“全库混学”。
现在桌面端新增“当前学习词本”机制，用户在内容包页点击某个词本的“开始学习”后，今日练习、句子填空、
单词本和统计都会只读取这个词本里的句子、挖空词和练习记录，更接近百词斩、不背单词这类商业单词软件的
词本选择体验。

新增或更新的主要内容：

- `app_settings` 新增 `activeContentPackId` 设置，用来保存当前学习词本。
- 首次启动或旧库升级时，如果没有已选词本，会自动回退到第一个启用词本并保存。
- 仓储层加载状态时按当前词本过滤 `sentences`、`sentence_blanks`、`practice_attempts` 和单词本数据。
- 单词表改为从当前词本的挖空词生成，解决同一个单词跨多个词本时被错误合并或漏展示的问题。
- 内容包页新增“开始学习 / 正在学习”按钮和当前词本高亮，切换后立即刷新工作台状态。
- 今日练习、句子填空、单词本和统计页都显示当前词本名称，避免用户误以为仍在全库混学。
- 浏览器预览模式也按当前词本过滤，方便开发态验收。
- 新增 `activeContentPack` 纯函数和测试，覆盖“保留已选启用词本”和“不可用时回退第一个启用词本”。

主要修改或新增文件：

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/storage/activeContentPack.ts`
- `apps/desktop/src/storage/activeContentPack.test.ts`
- `apps/desktop/src/storage/repository.ts`
- `apps/desktop/src/storage/types.ts`
- `apps/desktop/src/styles.css`
- `docs/TASK_PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

验证情况：

- 已运行 `corepack pnpm format`，格式化项目文件。
- 已运行 `corepack pnpm format:check`，格式检查通过。
- 已运行 `corepack pnpm lint`，ESLint 检查通过。
- 已运行 `corepack pnpm typecheck`，递归类型检查通过。
- 已运行 `corepack pnpm test`，3 个测试文件、14 条用例通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，原生层 1 条测试通过。
- 已运行 `corepack pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `corepack pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，release 构建通过，并生成
  `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。
- 已启动 release 版桌面端并查询真实 SQLite 数据库，确认旧库会自动保存
  `activeContentPackId=bestlng-starter-en-zh`，默认入门包加载为 8 句、8 个词条。

遗留问题：

- 当前已经做到“选择哪个词本就只学哪个词本”，但还没有商业单词软件常见的学习计划能力，例如每日新词数、
  按顺序解锁、整本词书学习进度、已学/未学/复习分组。后续可以在当前词本机制之上继续补。

## 18. 优化内置考试词本学习顺序

本阶段根据用户反馈修正内置考试词本的默认顺序。之前 CET4、CET6、IELTS、TOEFL 词包基本沿用
ECDICT 原始导出顺序，体验上接近按字母表学习，容易出现同前缀/形近词连续堆叠，也不符合商业单词软件
常见的“词书范围 + 新词顺序 + 复习调度”体验。

调研结论：

- 新词引入不适合简单按字母表排序，优先级应更多参考词频、考试核心度和学习阶段。
- 相似词、同前缀词连续出现会增加混淆风险，应尽量分散。
- 已学词的再次出现应交给复习调度；本阶段只处理“词本中新词的默认学习顺序”。

新增或更新的主要内容：

- `packages/content/scripts/generate_exam_packs.py` 新增学习排序策略：
    - 使用 ECDICT 的 `collins`、`oxford`、`bnc`、`frq` 和考试标签估计优先级。
    - CET4/CET6 保留基础高频词靠前。
    - IELTS/TOEFL 会把过于基础的短高频功能词适度后置，让开头更贴近目标考试词本。
    - 使用 8 词窗口分散同前缀/形近词，减少连续学习相似词的干扰。
- 重新生成 4 个考试 JSON 词包，词条数量保持不变：
    - CET4：3846 条
    - CET6：5406 条
    - IELTS：5038 条
    - TOEFL：6970 条
- 每条句子的 `tags` 新增 `order:00001` 这类稳定学习序号。
- 桌面端仓储层按 `order:` 标签排序出题，并让单词本展示顺序与学习顺序一致。
- 旧数据库启动时会根据内置包描述变化自动刷新词包元数据和句子内容；句子 ID 保持稳定，避免丢失已有练习记录。
- 内容包测试增加防回归校验，确认考试词包带有学习序号，且前 50 个词不会退回字母表顺序。
- `packages/content/packs/exam/README.md` 补充词序策略说明。

主要修改或新增文件：

- `apps/desktop/src/storage/repository.ts`
- `packages/content/scripts/generate_exam_packs.py`
- `packages/content/src/content.test.ts`
- `packages/content/packs/exam/bestlng-cet4-en-zh.json`
- `packages/content/packs/exam/bestlng-cet6-en-zh.json`
- `packages/content/packs/exam/bestlng-ielts-en-zh.json`
- `packages/content/packs/exam/bestlng-toefl-en-zh.json`
- `packages/content/packs/exam/README.md`
- `docs/TASK_PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

验证情况：

- 已运行 `python packages/content/scripts/generate_exam_packs.py`，成功重新生成 4 个内置考试词本。
- 已运行 Node 抽查脚本，确认各考试词本前 20 个词已经不是字母表顺序，且 manifest 版本为 `0.2.0`。
- 已运行 `corepack pnpm format`，格式化项目文件。
- 已运行 `corepack pnpm format:check`，格式检查通过。
- 已运行 `corepack pnpm lint`，ESLint 检查通过。
- 已运行 `corepack pnpm typecheck`，递归类型检查通过。
- 已运行 `corepack pnpm test`，3 个测试文件、14 条用例通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，原生层 1 条测试通过。
- 已运行 `corepack pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `corepack pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，release 构建通过，并生成
  `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。

遗留问题：

- 当前排序仍是离线启发式策略，不是完整个性化算法；后续如果要更像商业单词软件，还需要新增每日新词数、
  新词/复习混排、整本词书进度、用户熟词跳过和按正确率动态调整顺序。

## 19. 重设计桌面端沉浸阅读风格界面

本阶段根据用户确认的 A 风格方向，对桌面端前端做了一轮整体设计收敛：从偏后台/工程调试台的蓝白界面，
调整为暖白纸感、深墨绿、安静阅读式的学习界面，更接近“不背单词”一类沉浸阅读产品的气质。

新增或更新的主要内容：

- 主视觉改为暖白背景、纸张卡片、深墨绿主按钮、柔和阴影和轻量进入动效。
- 侧边栏、页面标题、统计卡片、练习卡、词书卡片、复习列表和设置表单统一了圆角、间距、颜色和交互反馈。
- 练习页改成“先读英文句子，再根据释义线索填写缺失词”的结构。
- 做题前不再展示完整翻译中包含目标词的文案，避免提前泄题；正确答案和完整提示只在提交后反馈里展示。
- 词书页从“内容包元数据列表”改成书架式卡片，只展示词书名、用途、句子数和学习状态。
- 主学习流移除了 `SQLite`、许可证长串、JSON/CSV 等技术性或开发者视角文案。
- 导航和页面摘要从工程语言改为学习产品语言，例如“词书”“读句子，补缺词”“练习趋势和薄弱词”。
- 考试词包生成脚本去掉“这句英文用于练习 xxx”这类生成痕迹，并将内置考试词包版本升到 `0.3.0`，
  让旧数据库启动时自动刷新不会泄题的提示文本。
- 在 CSS 中补充 `prefers-reduced-motion` 兼容，保留焦点态、触控尺寸和响应式布局。

主要修改或新增文件：

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/app/navigation.ts`
- `apps/desktop/src/styles.css`
- `packages/content/scripts/generate_exam_packs.py`
- `packages/content/packs/exam/bestlng-cet4-en-zh.json`
- `packages/content/packs/exam/bestlng-cet6-en-zh.json`
- `packages/content/packs/exam/bestlng-ielts-en-zh.json`
- `packages/content/packs/exam/bestlng-toefl-en-zh.json`
- `docs/TASK_PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

验证情况：

- 已运行 `python packages/content/scripts/generate_exam_packs.py`，重新生成 4 个考试词本。
- 已运行主前端文本扫描，确认 `apps/desktop/src/App.tsx`、`styles.css` 和 `navigation.ts` 中不再残留
  `SQLite`、`Tatoeba`、`ECDICT`、许可证、`JSON`、`CSV`、`用于练习` 等主界面不该出现的文案。
- 已运行 Node 抽查脚本，确认 4 个考试词本版本为 `0.3.0`，且首条提示不再包含目标词泄题文案。
- 已运行 `corepack pnpm format`，格式化项目文件。
- 已运行 `corepack pnpm format:check`，格式检查通过。
- 已运行 `corepack pnpm lint`，ESLint 检查通过。
- 已运行 `corepack pnpm typecheck`，递归类型检查通过。
- 已运行 `corepack pnpm test`，3 个测试文件、14 条用例通过。
- 已运行 `corepack pnpm desktop:build`，桌面端 Vite 构建通过。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，原生层 1 条测试通过。
- 已运行 `corepack pnpm --filter @bestlng/desktop exec tauri build --no-bundle`，release 构建通过，并生成
  `apps/desktop/src-tauri/target/release/bestlng-desktop.exe`。

遗留问题：

- 由于当前环境缺少 Playwright 浏览器内核，未能自动截图；本阶段已通过构建、文本扫描和真实 release 构建做验证。
- 4 个考试词包仍直接打入前端 bundle，构建时仍有 chunk 体积提醒；后续可改为 Tauri resource 或懒加载资源。

## 20. 添加 MIT 许可证并提交推送积压改动

本阶段根据用户要求处理仓库安全与合规两件事：为项目补充开源许可证，并把第 12~19 阶段
积压在工作区的全部改动分组提交、推送到 GitHub。此前本地 `main` 与 `origin/main` 都停在
第 11 阶段对应的提交，第 12~19 阶段约 2700 行改动和 15 MB 内容包数据只存在于工作区，
存在丢失风险。

新增或更新的主要内容：

- 新增根目录 `LICENSE`，采用 MIT 许可证（用户确认选择），版权归属 `2026 daluoxiaojun`。
- `README.md` 末尾新增“许可证”章节，说明代码采用 MIT 开源，内容数据的来源与许可证
  见 `packages/content/packs/exam/README.md`。
- 4 个考试词包 JSON（约 15 MB）按用户确认直接进入 Git 仓库，不使用 Git LFS。
- 将工作区积压改动按依赖顺序分成 5 个提交推送到 `origin/main`：
    1. `feat: 生成内置考试词包与学习顺序`：packages/content 的词包数据、生成脚本和测试。
    2. `feat: 桌面端接入考试词本与沉浸阅读界面`：apps/desktop 前端与 Rust 原生层。
    3. `feat: 官网展示考试词本并准备 Cloudflare 部署`：apps/site、wrangler.toml、根脚本与锁文件。
    4. `chore: 添加 MIT 许可证`：LICENSE 与 README.md。
    5. `docs: 同步阶段日志与任务清单`：docs 目录。

主要修改或新增文件：

- `LICENSE`
- `README.md`
- `docs/DEVELOPMENT_LOG.md`

验证情况：

- 本次会话开始时已运行 `corepack pnpm lint`、`corepack pnpm typecheck` 和
  `corepack pnpm test`（3 个测试文件、14 条用例），全部通过；此后仅新增 LICENSE
  和文档内容，不影响验证结论。
- 已运行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，原生层测试通过。
- 文档修改后已运行 `corepack pnpm format` 和 `corepack pnpm format:check`，格式检查通过。
- 提交前已确认 `wrangler.toml` 不含敏感信息，untracked 目录中没有误入的原始语料大文件。

遗留问题：

- Cloudflare Pages 首次真实部署仍需要用户在交互终端登录 Wrangler 或提供
  `CLOUDFLARE_API_TOKEN`。
- 词包 JSON 直接进入 Git 后，若后续频繁重新生成导致仓库历史膨胀，可以再评估改用
  Git LFS 或 Release 附件分发。

下一步建议：完成 Cloudflare Pages 首次部署并归档任务清单第 8 节，随后进入第 9 节配置
GitHub Releases、GitHub Actions 构建安装包和 Tauri updater。
