# TVBox Coach

简单好用的 TVBox 学习站：使用教程 + 浏览器端小工具。样式与结构完全基于
[**Astro Theme Lotus**](https://github.com/prosefly/astro-theme-lotus)
（`@prosefly/astro-theme-lotus`）实现：主题以 Astro integration 形式提供全部布局、
导航、页脚、文档路由、本地搜索（pagefind）与设计令牌（Tailwind v4），
站点仓库只保留内容、`theme.config.json` 和自定义页面。

> 所有工具均在浏览器本地运行，不采集、不上传任何数据。包管理使用 **pnpm**。

## 快速开始

```bash
pnpm install
pnpm dev        # 开发服务器 http://localhost:4321
pnpm build      # 生产构建（输出 dist/，纯静态）
pnpm preview    # 本地预览构建产物
```

## 架构

```
astro.config.ts     # integrations: [lotus()] —— 主题注入教程路由 / 搜索 / 样式
theme.config.json   # 站点名、顶部导航、侧边栏（docsNav）、页脚、社交链接、搜索配置
```

- **使用教程**：`src/content/docs/*.mdx`（docs collection，主题的 `docsLoader` +
  `docsSchema` 加载），自动获得侧边栏、TOC、本地搜索、上一篇/下一篇、原文件
  `.md` 端点与 `llms.txt`。新增教程：在该目录新建 `.mdx`，在 `theme.config.json`
  的 `docsNav.items` 里登记即可。
- **首页 / 工具箱**：`src/pages/` 下的自定义页面，使用主题导出的布局
  （`BaseLayout` + `SiteHeader`/`SiteFooter`，或 `TextLayout`），样式直接用
  Tailwind 工具类 + `--lotus-*` 设计令牌。
- **工具交互逻辑**：`src/scripts/*.ts`（DOM 接线）+ `src/tools/`（纯函数逻辑），
  由 Astro `<script>` 打包内联进页面，零运行时框架依赖。

## 功能

### 工具箱（原生 TS，纯前端运行）

| 工具 | 路径 | 页面脚本 | 说明 |
| --- | --- | --- | --- |
| 接口解析与格式化 | `/tools/parse` | `src/scripts/parse.ts` | 粘贴配置 JSON 或在线抓取，提取站点/直播/Spider 摘要 |
| 直播源转换 | `/tools/live-convert` | `src/scripts/live-convert.ts` | m3u ↔ txt（`#genre#`）互转，去重 + 分组统计 |
| 接口测活 | `/tools/check` | `src/scripts/check.ts` | 并发探测接口可用性，CORS 失败自动降级为可达性探测 |

工具页表单样式在 `src/styles/tools.css`，全部使用主题的 `--lotus-*` 令牌，
自动跟随主题深浅色。

## 目录结构

```
├── astro.config.ts           # Astro 配置（lotus integration）
├── theme.config.json         # Lotus 主题配置（导航 / 页脚 / docsNav / 搜索）
├── src/
│   ├── content.config.ts     # docs collection（docsLoader + docsSchema）
│   ├── content/docs/         # 教程 MDX（新增教程放这里）
│   ├── pages/
│   │   ├── index.astro       # 首页（BaseLayout + SiteHeader/Footer）
│   │   └── tools/            # 工具箱列表 + 三个工具页（TextLayout）
│   ├── scripts/              # 工具页面脚本（原生 TS，构建时打包内联）
│   ├── tools/                # 工具纯函数逻辑（parser / liveSource / checker）
│   ├── data/tools.ts         # 工具元数据
│   └── styles/tools.css      # 工具页表单样式（--lotus-* 令牌）
└── public/favicon.svg
```

## 免责声明

本站内容仅供学习交流，不存储、不分发任何影视资源，请遵守当地法律法规。
