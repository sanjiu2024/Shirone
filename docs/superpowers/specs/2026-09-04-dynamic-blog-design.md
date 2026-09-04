# 动态博客设计（B：全自研评论）— 2026-09-04

> 基线：`sanjiu2024/Shirone@main` fork 自 `LyraVoid/Shirone@c150891`（Astro 7.2.6 + Svelte 5 + Tailwind 4 + Stylus）。
> 目标：保留 Shirone M3E 视觉，改为 Astro SSR + MySQL 全动态，后台可发文，访客 GitHub 登录可评论，部署到宝塔（有域名+公网）。
> 路线：B（Giscus/Artalk 皆不用，评论存自家 DB，OAuth 自研）。A/C 见决策附录，已否决为 MVP。

## 1. 架构

- `output: 'server'` + `@astrojs/node` adapter，Node 20/22（宝塔 Node 版本管理器）。`site/base` 按宝塔域名重建。
- 保留：HCT 动态配色（`src/utils/mc-utils.ts`）、语义 token（`--primary/--surface-*`）、形状（`--shape-corner-*`）、Swup（`containers:[main,#toc]`、`cache/preload`）、单 85rem / 双 96rem、`resolvePageWidth()`。
- 数据层：MySQL 5.7+/8.0+（宝塔 `数据库` 建库，`计划任务` 每日备库）。`src/lib/db.ts` 唯一出口，连接信息全走 env。
- 表（MVP）：
  - `users(id PK, github_id UNIQUE, login, avatar_url, role ENUM('admin','user'), created_at)`
  - `sessions(id PK, user_id FK, expires_at, created_at)`（或 JWT + DB 白名单，HttpOnly Cookie）
  - `posts(id PK, slug UNIQUE, title, description, cover_nullable, category, tags JSON, content_md MEDIUMTEXT, html_cache MEDIUMTEXT, status ENUM('draft','published'), pinned BOOL, created_at, updated_at)` + 索引 `(status, created_at)`
  - `comments(id PK, post_id FK, user_id FK, parent_id FK NULL, content VARCHAR(2000), status ENUM('published','pending','spam'), ip_hash CHAR(64), created_at)` + 索引 `(post_id, created_at)`
- 接口（`src/pages/api/`）：
  - `auth/github.ts`（跳 GitHub）、`auth/callback/github.ts`（换 token、建 user/session、写 Cookie）、`auth/logout.ts`、`auth/me.ts`
  - `posts/index.ts`（GET 公开列表）、`posts/[slug].ts`（GET 公开）、admin 写操作走 `POST/PUT/DELETE` 且服务端验 `role=admin`
  - `comments/index.ts?postId=`（GET 公开 published）、`POST`（需 session + 限频）、`comments/[id].ts`（DELETE：作者或 admin）
- 前台 SSR 读 DB；`/admin` 独立布局，不进阅读壳。`moments/albums/anime/friends/projects/skills/timeline` 首版仍走文件（`src/content`、`src/data`），不进 DB。

## 2. 组件

- 删除依赖：`src/config/commentConfig.ts` 的 `none|twikoo` 保留做兼容（默认 `none`），新增 `provider: "github-db"` 时走自研；`CommentSection.astro/Twikoo.astro` 短路保留，新增 `CommentIsland.svelte(client:visible)`。
- 新增：`AdminLayout.astro`、`PostEditor.svelte`（Markdown 文本域 + 预览，复用现有 markdown 管线子集）、`CommentModeration.svelte`、`GithubLoginButton.svelte`。
- 前台列表/详情：`[...page].astro/[...permalink].astro/archive/categories/tags` 由 `getCollection(posts)` 改为 SQL 查询（分页、过滤 `status=published`）。`comment: false` 的文章不渲染评论岛。
- Swup：评论岛在 `content:replace` 后重挂，持久壳外逻辑走事件委托；`prefersReducedMotion()` 保持。
- i18n：新增 key 走 `src/i18n/i18nKey.ts` + 10 语言补全，占位符同名。

## 3. 数据流

- 访客：点 GitHub 登录 → `callback`（`https://<域名>/api/auth/callback/github`）→ 写 `HttpOnly; Secure; SameSite=Lax` Cookie → `me` 回显头像/login。
- 发评：`POST /api/comments {postId, content, parentId?}` → 服务端验 session → 限频（同 IP 1 分钟 ≤3）→ 长度/重复/关键词 → 写入 `published`（首版无预审核，后台可改 spam/删除）。
- 博主：`ADMIN_GITHUB_ID=<你的 github id>`（= `sanjiu2024` 的 id，env 配置）→ 自动 `role=admin` → 评论显博主徽标，有删除/置顶；后台 `/admin` 可建/改/删 posts（写 `content_md` + 预渲染 `html_cache`）。
- OAuth App：在 GitHub `Settings/Developers` 建 App，`Authorization callback URL` 填生产域名回调；`AUTH_GITHUB_ID/SECRET/AUTH_SECRET` 放宝塔 env，不进 git。

## 4. 错误处理

- OAuth 失败：回登录页 `?err=oauth`，不抛 500。
- 未登录调写接口：`401`；非 admin 调 admin 接口：`403`；DB 断开：`500` + `logs/error.log`，前台降级为“评论暂不可用”。
- 限频命中：`429 + Retry-After`。
- 内容校验失败：`400 + 字段级错误`（content 空/超 2000/重复提交）。

## 5. 测试

- `npx.cmd astro check` 0 errors；`pnpm.cmd type-check` 通过；`pnpm.cmd exec biome ci ./src` 只读。
- Playwright（新增 `tests/site/dynamic-blog.spec.ts` + 跑 `a11y.spec.ts`）：
  1. 访客（mock session）：登录→发评→列表可见；
  2. 未登录 `POST /api/comments` → 401；
  3. admin 发布→前台列表/详情可见→删除评论生效。
- 手工：直接加载 + Swup 切页两种路径验评论挂载；深浅色两套 token 下对比。

## 6. 宝塔部署

- 软件：`Node版本管理器`（20/22）+ `Nginx` + `MySQL`。Node 只绑 `127.0.0.1:3000`，`网站>Node项目>添加`（PM2 cluster），`外网映射` 自动生成 Nginx 反代（80/443→3000），`SSL` 用 Let's Encrypt + 强制 HTTPS。
- `ecosystem.config.cjs` 入库（`name/blog, cwd=/www/wwwroot/blog, exec_mode=cluster, instances=max, watch=false, max_memory_restart=500M, env_production={NODE_ENV,PORT,HOSTNAME}`）。
- 更新：`git pull + npm ci + npm run build + pm2 reload ecosystem.config.cjs --env production + pm2 save`。`.env.production` 在服务器，不进 git。`NEXT_PUBLIC_*` 之类构建期变量改了必须重 build。
- 备份：`计划任务>备份数据库`（每日 03:00，保留 3-5 份）+ `备份网站`（02:00 错峰）。

## 7. 范围（YAGNI）

- 做：posts 全动态 + 评论全自研 + admin 最小闭环 + 宝塔上线。
- 不做：moments/albums/anime 进 DB、匿名评论、积分/通知、Pagefind 对 DB 增量索引（首版构建期索引 published 快照即可）、Twikoo/Giscus 双轨。

## 附录：否决路线

- A（Giscus 零后端）：15 分钟上线但评论数据不在己库、iframe 只能 CSS 换肤、访客必须有 GitHub 号。与“全动态+后台统一管评论”冲突，否决为 MVP。
- C（Artalk 侧挂）：多一个 Go 常驻服务，UI 只能覆盖，OAuth 还要另配。与“100% Shirone 化 + 单进程好运维”冲突，否决。
- Twikoo：无原生 GitHub OAuth，不满足硬需求，否决（原生 `commentConfig.ts#L19 provider: none|twikoo` 为证）。
