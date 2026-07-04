# Site

BestLNG 官网发布页目录。

当前目录提供一个无需新增依赖的静态发布页，用于项目介绍、桌面客户端下载区、
核心功能、开源说明和版本状态展示。

## 本地预览

可以直接在浏览器打开 `apps/site/index.html`。

也可以从仓库根目录运行：

```bash
pnpm --filter @bestlng/site preview
```

默认预览地址是 `http://127.0.0.1:4173`。如果端口被占用，可以设置 `PORT` 环境变量。

## 部署说明

该页面不依赖构建步骤，已配置为 Cloudflare Pages 静态站。

首次部署前需要先在本机完成 Cloudflare 登录，或在环境变量中提供
`CLOUDFLARE_API_TOKEN`。确认登录状态：

```bash
pnpm --filter @bestlng/site exec wrangler whoami
```

部署命令：

```bash
pnpm site:deploy
```

Cloudflare Pages 项目名为 `bestlng`，静态文件目录为 `apps/site`。
