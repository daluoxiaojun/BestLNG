# Desktop App

BestLNG 桌面客户端目录。

这里使用 Tauri 2 + React + TypeScript + Vite 搭建桌面客户端，优先完成本地离线学习流程。

当前桌面端已接入 SQLite 本地数据层，会在首次启动时写入内置 CC0 示例内容包。用户可以
完成句子挖空练习，应用会记录答题结果、薄弱词和基础学习统计。

## 常用命令

- `pnpm --filter @bestlng/desktop dev`
- `pnpm --filter @bestlng/desktop build`
- `pnpm --filter @bestlng/desktop tauri:dev`
- `pnpm --filter @bestlng/desktop tauri:build`
- `pnpm --filter @bestlng/desktop exec tauri build --no-bundle`
