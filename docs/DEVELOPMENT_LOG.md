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
