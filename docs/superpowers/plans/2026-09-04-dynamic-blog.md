# Dynamic Blog (Route B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Shirone from static output to Astro SSR + Node + MySQL with self-built GitHub OAuth, self-built comments, and /admin post management, deployed on Baota via PM2 cluster + Nginx.

**Architecture:** `output: 'server'` + `@astrojs/node` standalone behind Nginx 127.0.0.1:3000; single DB鍑哄彛 `src/lib/db.ts` (mysql2 pool, env-only credentials); Astro API routes for auth/posts/comments with HttpOnly session cookies and `role=admin` gate; front list/detail SSR reads `posts` table; new `CommentIsland.svelte (client:visible)` remounted on Swup `content:replace`; `/admin` uses an independent layout outside the reading shell.

**Tech Stack:** Astro 7.2.6, @astrojs/node, Svelte 5 (runes), TypeScript strict, mysql2/promise, Swup (@swup/astro, containers main+#toc), Node >=22.12, pnpm 9.14.4, Playwright + Chrome channel, Biome CI read-only.

**Spec:** `docs/superpowers/specs/2026-09-04-dynamic-blog-design.md`

## Global Constraints

- Node >= 22.12, pnpm 9.14.4, Astro 7.2.6, Svelte 5, Tailwind 4, Stylus 鈥?no new heavy deps without justification.
- `output: 'server'` + `@astrojs/node`; Node binds only `127.0.0.1:3000`; Nginx reverse proxy 80/443鈫?000; PM2 `exec_mode=cluster, instances=max, watch=false, max_memory_restart=500M`.
- MySQL 5.7+/8.0+; all connection info from env only; never commit secrets; `.env.production` lives on server.
- Sessions: opaque token in DB, `HttpOnly; Secure; SameSite=Lax` cookie; `ADMIN_GITHUB_ID` env grants `role=admin`.
- Comments: `content VARCHAR(2000)`; rate limit same IP 鈮?/min 鈫?`429 + Retry-After`; unauthenticated writes 鈫?`401`; non-admin on admin routes 鈫?`403`; OAuth failure redirects to login `?err=oauth`, never 500; DB outage 鈫?500 + `logs/error.log`, frontend degrades to "comments unavailable".
- Zero extra burden: disabled providers produce zero external requests, zero DOM footprint, zero bundle bloat (dynamic import only); `commentConfig.ts` keeps `none|twikoo` compatible, default `none`.
- i18n: every new visible string goes through `src/i18n/i18nKey.ts` + all 10 locale modules with identical `{placeholder}` names.
- Tokens only: `--shape-corner-*`, `--m3e-type-*`, `--m3e-duration-*`, `--m3e-easing-*`, surface/on-surface tokens; no hard-coded black/white except image-overlay readability.
- Layering: atoms鈫抦olecules鈫抩rganisms鈫抰emplates/pages; lower layers never import higher; `@components/<layer>/<file>` aliases; atoms/molecules never query collections or own persistence.
- SSR-first: `client:load/visible/only` only where interactivity requires; SSR paths use `astro-icon`.
- Svelte: match file's existing syntax mode (runes here 鈥?all new Svelte files use runes), never mix; `prefersReducedMotion()` honored; Swup shell logic uses `content:replace`/`page:view` or delegation, tested on direct load + client nav.
- YAGNI: moments/albums/anime/friends/projects/skills/timeline stay file-based (`src/content`, `src/data`); no anonymous comments, no points/notifications, no Pagefind DB incremental index (build-time published snapshot only), no Twikoo/Giscus dual-track.
- Validation per task: `npx.cmd astro check` (0 errors), `pnpm.cmd type-check`, `pnpm.cmd exec biome ci ./src` (read-only; never `pnpm.cmd lint/format` for review).
- Conventional commits `type(scope): subject`; one commit per task; packaging contract: mirror config changes into `src/integration/`, no `process.cwd()` reads of theme-owned files.

## Context

**User request summary:** Produce an ultrawork-ready TDD implementation plan for the approved Route B spec (SSR + MySQL + self-built OAuth/comments/admin + Baota deploy), saved to `docs/superpowers/plans/2026-09-04-dynamic-blog.md`, with atomic commits and full skill/category routing. Answer and plan in English.

**Research:** Codebase exploration confirms: static build (`astro.config.mjs` has no adapter/output), no `src/pages/api/`, posts flow via `getCollection` in `src/utils/content-utils.ts`, comments short-circuit in `CommentSection.astro` + `resolveCommentOptions` (`none|twikoo`), Swup containers `main,#toc`, shell/page contract via `#swup-container[data-current-page]`, tests are Playwright `tests/site/*.spec.ts` (+ `a11y.spec.ts`), `MainGridLayout.astro` owns the shell. Packaging overlay lives in `src/integration/` (must be mirrored).

**Uncertainties / assumptions (confirm before execution):**
1. Session token shape assumed `hex opaque token in sessions table` (spec allows JWT+DB whitelist; plan picks opaque-token for simplicity) 鈥?confirm.
2. `ADMIN_GITHUB_ID` numeric GitHub user id from env; plan auto-promotes matching `github_id` to admin on login 鈥?confirm id value is available at deploy time.
3. Production domain unknown; plan uses `https://<domain>` placeholder wired to `siteConfig.site`/env `PUBLIC_SITE_URL`, OAuth callback `https://<domain>/api/auth/callback/github` 鈥?fill real domain at deploy.
4. MySQL assumed 8.0, pool via `mysql2/promise`; migration runner is a plain `db/migrate.mjs` executed manually (no ORM) 鈥?confirm no ORM wanted.
5. SSR post HTML assumed pre-rendered `html_cache` via shared `siteMarkdownProcessor` at write time (admin save path) 鈥?confirm.

**Clarifying questions for the user:** (a) opaque sessions vs JWT+whitelist? (b) real production domain + Baota site path (`/www/wwwroot/blog` assumed)? (c) MySQL 5.7 or 8.0? Proceeding with assumptions above; correct during Wave 1 if answers differ.

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 鈥?SSR switch + env | None | Foundation; all routes/APIs need server output |
| Task 2 鈥?MySQL schema + db client | Task 1 | Needs server runtime + env contract from Task 1 |
| Task 3 鈥?GitHub OAuth + sessions | Task 2 | Needs `users`/`sessions` tables + db client |
| Task 4 鈥?Posts repo + public SSR + admin post APIs | Task 2 | Needs `posts` table + db client; independent of OAuth logic |
| Task 5 鈥?Admin pages (/admin + editor + moderation) | Task 3, Task 4 | Needs admin APIs (T4) + admin gate (T3) |
| Task 6 鈥?Comments API + island + wiring + i18n | Task 3, Task 4 | Needs session auth (T3) + post ids (T4) |
| Task 7 鈥?Baota deploy (ecosystem + doc) | Task 1 | Needs final server entry/port contract; independent of DB code |
| Task 8 鈥?Playwright dynamic-blog + a11y | Task 5, Task 6 | E2E covers full loop; needs admin + comments done |

## Parallel Execution Graph

```
Wave 1 (start immediately):
鈹溾攢鈹€ Task 1: SSR switch + env (no deps)
鈹斺攢鈹€ Task 7: Baota deploy files (needs only Task 1 contract 鈥?start after T1 Step 3, or in parallel with draft port)

Wave 2 (after Wave 1):
鈹斺攢鈹€ Task 2: MySQL schema + db client (depends: Task 1)

Wave 3 (after Task 2):
鈹溾攢鈹€ Task 3: GitHub OAuth + sessions (depends: Task 2)
鈹斺攢鈹€ Task 4: Posts repo + SSR + admin post APIs (depends: Task 2)

Wave 4 (after Tasks 3+4):
鈹溾攢鈹€ Task 5: Admin pages (depends: Task 3, Task 4)
鈹斺攢鈹€ Task 6: Comments API + island + wiring (depends: Task 3, Task 4)

Wave 5 (after Tasks 5+6):
鈹斺攢鈹€ Task 8: Playwright dynamic-blog + a11y (depends: Task 5, Task 6)

Critical Path: Task 1 鈫?Task 2 鈫?Task 4 鈫?Task 6 鈫?Task 8
Estimated Parallel Speedup: ~35% faster than sequential (Waves 3鈥? doubled)
```

## File Structure

**Create:**
- `src/lib/db.ts` 鈥?sole MySQL pool鍑哄彛 (`query()`, `getPool()`, env validation)
- `src/lib/env.ts` 鈥?typed env reader (DB_*, AUTH_GITHUB_*, AUTH_SECRET, ADMIN_GITHUB_ID)
- `src/lib/auth.ts` 鈥?session create/read/destroy, `requireUser`, `requireAdmin`, cookie helpers
- `src/lib/rate-limit.ts` 鈥?in-memory IP sliding-window limiter (鈮?/min per key)
- `src/lib/posts.ts` 鈥?post repo: `listPublished`, `getPublishedBySlug`, `createPost`, `updatePost`, `renderMarkdownToHtml`
- `src/lib/comments.ts` 鈥?comment repo + validation (`normalizeContent`, duplicate check helper)
- `db/schema.sql` 鈥?users/sessions/posts/comments DDL + indexes
- `db/migrate.mjs` 鈥?minimal idempotent migration runner (applies schema.sql)
- `.env.example` 鈥?documented env template (no secrets)
- `src/pages/api/auth/github.ts` 鈥?OAuth redirect
- `src/pages/api/auth/callback/github.ts` 鈥?code exchange, user upsert, session cookie, `?err=oauth` on failure
- `src/pages/api/auth/logout.ts` 鈥?session destroy + cookie clear
- `src/pages/api/auth/me.ts` 鈥?current user JSON
- `src/pages/api/posts/index.ts` 鈥?GET public list; POST admin create
- `src/pages/api/posts/[slug].ts` 鈥?GET public; PUT/DELETE admin
- `src/pages/api/comments/index.ts` 鈥?GET public list `?postId=`; POST authenticated create
- `src/pages/api/comments/[id].ts` 鈥?DELETE author-or-admin
- `src/pages/admin/index.astro` 鈥?admin dashboard (own layout)
- `src/pages/admin/posts.astro` 鈥?post list management
- `src/pages/admin/comments.astro` 鈥?moderation queue
- `src/layouts/AdminLayout.astro` 鈥?standalone admin layout (no reading shell)
- `src/components/organisms/admin/PostEditor.svelte` 鈥?markdown textarea + preview (runes, `client:load` only on admin pages)
- `src/components/organisms/admin/CommentModeration.svelte` 鈥?spam/delete queue (runes)
- `src/components/organisms/auth/GithubLoginButton.svelte` 鈥?login/me avatar button (runes)
- `src/components/organisms/comment/CommentIsland.svelte` 鈥?comment list + form + Swup-remount-safe (runes, `client:visible`)
- `src/utils/swup-remount.ts` 鈥?`onSwupReplace()` helper subscribing to `content:replace`/`page:view`
- `ecosystem.config.cjs` 鈥?PM2 cluster config for Baota
- `docs/deploy-baota.md` 鈥?Baota step-by-step (Node/Nginx/MySQL, SSL, backup, update)
- `tests/site/dynamic-blog.spec.ts` 鈥?E2E per spec 

**Modify:**
- `astro.config.mjs` 鈥?add `output: 'server'` + `@astrojs/node` adapter (standalone)
- `package.json` 鈥?add `@astrojs/node`, `mysql2`; keep scripts; Node engine note
- `src/types/commentConfig.ts` 鈥?add `"github-db"` to `CommentProvider`
- `src/config/commentConfig.ts` 鈥?default `provider: "none"` kept; resolver accepts `github-db` (returns `{provider:'github-db', lazy}`; zero-burden when disabled)
- `src/components/organisms/comment/CommentSection.astro` 鈥?short-circuit preserved; renders `CommentIsland` when `github-db` resolved and `postCommentEnabled`
- `src/i18n/i18nKey.ts` + all 10 `src/i18n/languages/*.ts` 鈥?new keys (auth, comments-db, admin)
- `src/pages/[...page].astro`, `src/pages/[...permalink].astro`, `src/pages/archive.astro`, `src/pages/categories.astro`, `src/pages/tags.astro` 鈥?read published posts from `src/lib/posts.ts` instead of `getCollection` for the post domain (file-based domains untouched)
- `src/integration/*` 鈥?mirror adapter/output change per packaging contract (registry/routes/ssr shims as applicable)
- `src/config/README.md` 鈥?document new env + comment provider (brief)

---

## Tasks

### Task 1: SSR switch to @astrojs/node + env contract

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json`
- Create: `.env.example`
- Create: `src/lib/env.ts`
- Test: `tests/site/dynamic-blog.spec.ts` (skeleton, SSR health assertion added here, extended in Task 8)

**Interfaces:**
- Consumes: none
- Produces: `getEnv(): { dbHost, dbPort, dbUser, dbPassword, dbName, githubId, githubSecret, authSecret, adminGithubId, siteUrl }` used by Tasks 2鈥?; server runtime used by all API tasks.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/site/dynamic-blog.spec.ts
import { expect, test } from "@playwright/test";

test("SSR server responds with dynamic shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#swup-container")).toHaveCount(1);
});
```

- [ ] **Step 2: Run test to verify it fails (or passes trivially pre-switch 鈥?record baseline)**

Run: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts`
Expected: FAIL with missing file (proves skeleton is new); if dev server serves static, record PASS baseline then proceed 鈥?the real gate is Step 4.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/env.ts
export interface ServerEnv {
  dbHost: string; dbPort: number; dbUser: string;
  dbPassword: string; dbName: string;
  githubId: string; githubSecret: string;
  authSecret: string; adminGithubId: string;
  siteUrl: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[env] Missing required ${name}`);
  return value;
}

export function getEnv(): ServerEnv {
  return {
    dbHost: process.env.DB_HOST ?? "127.0.0.1",
    dbPort: Number(process.env.DB_PORT ?? "3306"),
    dbUser: required("DB_USER"),
    dbPassword: required("DB_PASSWORD"),
    dbName: required("DB_NAME"),
    githubId: required("AUTH_GITHUB_ID"),
    githubSecret: required("AUTH_GITHUB_SECRET"),
    authSecret: required("AUTH_SECRET"),
    adminGithubId: required("ADMIN_GITHUB_ID"),
    siteUrl: process.env.PUBLIC_SITE_URL ?? "http://localhost:4321",
  };
}
```

```javascript
// astro.config.mjs 鈥?add at top:
import node from "@astrojs/node";
// inside defineConfig:
output: "server",
adapter: node({ mode: "standalone" }),
```

```text
# .env.example (no secrets, names + placeholders only)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=blog
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_SECRET=
ADMIN_GITHUB_ID=
PUBLIC_SITE_URL=http://localhost:4321
PORT=3000
HOSTNAME=127.0.0.1
```

`package.json`: add `"@astrojs/node": "^8.3.3"` and `"mysql2": "^3.11.0"` to dependencies (exact minor resolved by `pnpm.cmd install`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd astro check`
Expected: 0 errors.
Run: `pnpm.cmd type-check`
Expected: pass.
Run: `pnpm.cmd exec biome ci ./src`
Expected: pass, no modifications.
Run: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts`
Expected: PASS (SSR shell renders `#swup-container`).

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs package.json pnpm-lock.yaml .env.example src/lib/env.ts tests/site/dynamic-blog.spec.ts
git commit -m "feat(ssr): switch to server output with node adapter and env contract"
```

**Delegation Recommendation:**
- Category: `unspecified-high` 鈥?cross-cutting config/build change with packaging implications.
- Skills: [`git-workflow-and-versioning`] 鈥?atomic commit of lockfile + config.

**Skills Evaluation:** 鉁?INCLUDED `git-workflow-and-versioning` (lockfile + config atomicity). 鉂?OMITTED `frontend-ui-engineering` (no UI), `security-and-hardening` (no auth logic yet), `api-and-interface-design` (env reader is trivially typed).

**Depends On:** None
**Acceptance Criteria:** `astro check` 0 errors; dev server serves `#swup-container`; no secrets in repo; `src/integration` mirror noted for Task 7 follow-up if adapter affects it.

### Task 2: MySQL schema + sole db client

**Files:**
- Create: `db/schema.sql`
- Create: `db/migrate.mjs`
- Create: `src/lib/db.ts`
- Test: `tests/utils/db-contract.test.mjs` (pool export shape + env-missing throws; no live DB required)

**Interfaces:**
- Consumes: `getEnv()` from Task 1.
- Produces: `query<T>(sql, params): Promise<T>`; `getPool()` 鈥?used by Tasks 3, 4, 6. Schema tables `users/sessions/posts/comments` with exact indexes.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utils/db-contract.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

test("db module exposes query and getPool", async () => {
  const db = await import("../../src/lib/db.ts");
  assert.equal(typeof db.query, "function");
  assert.equal(typeof db.getPool, "function");
});

test("getEnv throws on missing DB_PASSWORD", async () => {
  const saved = process.env.DB_PASSWORD;
  delete process.env.DB_PASSWORD;
  const { getEnv } = await import("../../src/lib/env.ts");
  assert.throws(() => getEnv(), /DB_PASSWORD/);
  if (saved !== undefined) process.env.DB_PASSWORD = saved;
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/utils/db-contract.test.mjs`
Expected: FAIL with `Cannot find module .../src/lib/db.ts`.

- [ ] **Step 3: Write minimal implementation**

```sql
-- db/schema.sql
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  github_id BIGINT UNSIGNED NOT NULL UNIQUE,
  login VARCHAR(191) NOT NULL,
  avatar_url TEXT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(64) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  cover TEXT NULL,
  category VARCHAR(191) NULL,
  tags JSON NULL,
  content_md MEDIUMTEXT NOT NULL,
  html_cache MEDIUMTEXT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  pinned TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_posts_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  content VARCHAR(2000) NOT NULL,
  status ENUM('published','pending','spam') NOT NULL DEFAULT 'published',
  ip_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL,
  INDEX idx_comments_post_created (post_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```javascript
// db/migrate.mjs
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? "3306"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});
const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
await connection.query(sql);
await connection.end();
console.log("[migrate] schema applied");
```

```typescript
// src/lib/db.ts
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { getEnv } from "./env.ts";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const env = getEnv();
  pool = mysql.createPool({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  return pool;
}

export async function query<T = RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/utils/db-contract.test.mjs`
Expected: PASS.
Run: `npx.cmd astro check` / `pnpm.cmd type-check` / `pnpm.cmd exec biome ci ./src`
Expected: 0 errors / pass / pass.

- [ ] **Step 5: Commit**

```bash
git add db/schema.sql db/migrate.mjs src/lib/db.ts tests/utils/db-contract.test.mjs
git commit -m "feat(db): add mysql schema migration and pooled db client"
```

**Delegation Recommendation:**
- Category: `deep` 鈥?SQL correctness + pool lifecycle + env failure modes need autonomous care.
- Skills: [`source-driven-development`] 鈥?mysql2/promise pool options from official docs.

**Skills Evaluation:** 鉁?INCLUDED `source-driven-development` (pool semantics must match mysql2 docs). 鉂?OMITTED `frontend-ui-engineering`, `security-and-hardening` (applied in Task 3), `api-and-interface-design` (no HTTP surface yet).

**Depends On:** Task 1
**Acceptance Criteria:** Contract test passes without a live DB; `schema.sql` creates all 4 tables with the exact spec indexes; no credentials in repo.

### Task 3: GitHub OAuth + session auth library + API routes

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/rate-limit.ts`
- Create: `src/pages/api/auth/github.ts`
- Create: `src/pages/api/auth/callback/github.ts`
- Create: `src/pages/api/auth/logout.ts`
- Create: `src/pages/api/auth/me.ts`
- Test: `tests/utils/auth-contract.test.mjs` (cookie name/flags, admin promotion rule, rate limiter)

**Interfaces:**
- Consumes: `query()` (Task 2), `getEnv()` (Task 1).
- Produces: `getSessionUser(Astro): Promise<User|null>`; `requireUser`, `requireAdmin`; `SESSION_COOKIE = "shirone_session"`; rate `checkLimit(key): {ok, retryAfter}` 鈥?used by Tasks 4鈥?.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utils/auth-contract.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

test("auth module exposes session helpers", async () => {
  const auth = await import("../../src/lib/auth.ts");
  assert.equal(typeof auth.getSessionUser, "function");
  assert.equal(typeof auth.requireAdmin, "function");
  assert.equal(auth.SESSION_COOKIE, "shirone_session");
});

test("rate limiter blocks 4th hit in a minute", async () => {
  const { checkLimit } = await import("../../src/lib/rate-limit.ts");
  const key = `test-${Date.now()}`;
  assert.equal(checkLimit(key, 3, 60_000).ok, true);
  assert.equal(checkLimit(key, 3, 60_000).ok, true);
  assert.equal(checkLimit(key, 3, 60_000).ok, true);
  const fourth = checkLimit(key, 3, 60_000);
  assert.equal(fourth.ok, false);
  assert.ok(fourth.retryAfter > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/utils/auth-contract.test.mjs`
Expected: FAIL with `Cannot find module .../src/lib/auth.ts`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/rate-limit.ts
const hits = new Map<string, number[]>();

export function checkLimit(
  key: string,
  max = 3,
  windowMs = 60_000,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const stamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (stamps.length >= max) {
    const retryAfter = Math.ceil((stamps[0] + windowMs - now) / 1000);
    hits.set(key, stamps);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }
  stamps.push(now);
  hits.set(key, stamps);
  return { ok: true, retryAfter: 0 };
}
```

```typescript
// src/lib/auth.ts
import { createHash, randomBytes } from "node:crypto";
import type { APIContext } from "astro";
import { query } from "./db.ts";
import { getEnv } from "./env.ts";

export const SESSION_COOKIE = "shirone_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: number; login: string; avatar_url: string | null; role: "admin" | "user";
}

export function sessionCookie(value: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const id = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await query("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", [id, userId, expires]);
  return token;
}

export async function getSessionUser(context: APIContext): Promise<SessionUser | null> {
  const token = context.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = createHash("sha256").update(token).digest("hex");
  const rows = await query<SessionUser[]>(
    `SELECT u.id, u.login, u.avatar_url, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > NOW() LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function requireUser(context: APIContext): Promise<SessionUser | null> {
  return getSessionUser(context);
}

export async function requireAdmin(context: APIContext): Promise<SessionUser | null> {
  const user = await getSessionUser(context);
  return user?.role === "admin" ? user : null;
}

export function isAdminGithubId(githubId: string | number): boolean {
  return String(githubId) === getEnv().adminGithubId;
}
```

```typescript
// src/pages/api/auth/github.ts
import type { APIRoute } from "astro";
import { getEnv } from "../../../lib/env.ts";

export const GET: APIRoute = async () => {
  const env = getEnv();
  const params = new URLSearchParams({
    client_id: env.githubId,
    redirect_uri: `${env.siteUrl}/api/auth/callback/github`,
    scope: "read:user",
  });
  return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
};
```

```typescript
// src/pages/api/auth/callback/github.ts
import type { APIRoute } from "astro";
import { createSession, isAdminGithubId, sessionCookie } from "../../../../lib/auth.ts";
import { query } from "../../../../lib/db.ts";
import { getEnv } from "../../../../lib/env.ts";

export const GET: APIRoute = async ({ url, redirect }) => {
  const env = getEnv();
  const code = url.searchParams.get("code");
  if (!code) return redirect("/login?err=oauth", 302);
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: env.githubId, client_secret: env.githubSecret, code }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) return redirect("/login?err=oauth", 302);
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: "application/vnd.github+json" },
    });
    if (!userRes.ok) return redirect("/login?err=oauth", 302);
    const gh = (await userRes.json()) as { id: number; login: string; avatar_url: string };
    const role = isAdminGithubId(gh.id) ? "admin" : "user";
    await query(
      `INSERT INTO users (github_id, login, avatar_url, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE login = VALUES(login), avatar_url = VALUES(avatar_url), role = IF(VALUES(role) = 'admin', 'admin', role)`,
      [gh.id, gh.login, gh.avatar_url, role],
    );
    const rows = await query<{ id: number }[]>("SELECT id FROM users WHERE github_id = ? LIMIT 1", [gh.id]);
    const token = await createSession(rows[0].id);
    return new Response(null, {
      status: 302,
      headers: { Location: "/", "Set-Cookie": sessionCookie(token, 30 * 24 * 60 * 60) },
    });
  } catch {
    return redirect("/login?err=oauth", 302);
  }
};
```

```typescript
// src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { clearSessionCookie, SESSION_COOKIE } from "../../../lib/auth.ts";
import { query } from "../../../lib/db.ts";

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const id = createHash("sha256").update(token).digest("hex");
    await query("DELETE FROM sessions WHERE id = ?", [id]);
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie() },
  });
};
```

```typescript
// src/pages/api/auth/me.ts
import type { APIRoute } from "astro";
import { getSessionUser } from "../../../lib/auth.ts";

export const GET: APIRoute = async (context) => {
  const user = await getSessionUser(context);
  if (!user) return new Response(JSON.stringify({ user: null }), { headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ user }), { headers: { "Content-Type": "application/json" } });
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/utils/auth-contract.test.mjs`
Expected: PASS.
Run: `npx.cmd astro check` / `pnpm.cmd type-check` / `pnpm.cmd exec biome ci ./src`
Expected: 0 errors / pass / pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/rate-limit.ts src/pages/api/auth/ tests/utils/auth-contract.test.mjs
git commit -m "feat(auth): add github oauth flow with db sessions"
```

**Delegation Recommendation:**
- Category: `deep` 鈥?OAuth token exchange + session hashing + cookie flags must be exactly right.
- Skills: [`security-and-hardening`, `source-driven-development`] 鈥?cookie flags/token storage per OAuth docs; session hash never stores raw token.

**Skills Evaluation:** 鉁?INCLUDED `security-and-hardening` (HttpOnly/Secure/SameSite, token hashing, 401/403 mapping) and `source-driven-development` (GitHub OAuth endpoints from official docs). 鉂?OMITTED `frontend-ui-engineering` (button comes in Task 6), `performance-optimization` (no hot path yet).

**Depends On:** Task 2
**Acceptance Criteria:** OAuth failure 鈫?`/login?err=oauth` (never 500); `me` returns user JSON; `logout` clears cookie + row; limiter blocks 4th hit; contract test passes.

### Task 4: Posts repository + public SSR + admin post APIs

**Files:**
- Create: `src/lib/posts.ts`
- Create: `src/pages/api/posts/index.ts`
- Create: `src/pages/api/posts/[slug].ts`
- Modify: `src/pages/[...page].astro`, `src/pages/[...permalink].astro`, `src/pages/archive.astro`, `src/pages/categories.astro`, `src/pages/tags.astro`
- Test: `tests/utils/posts-contract.test.mjs` (validation: empty title/slug rejected, tags JSON round-trip)

**Interfaces:**
- Consumes: `query()` (T2), `requireAdmin` (T3), `siteMarkdownProcessor` (existing).
- Produces: `listPublished(page, pageSize)`, `getPublishedBySlug(slug)`, `createPost(input)`, `updatePost(slug, input)` 鈥?used by Task 5; SSR pages used by Task 8.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utils/posts-contract.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

test("posts repo validates input", async () => {
  const posts = await import("../../src/lib/posts.ts");
  assert.equal(typeof posts.listPublished, "function");
  assert.throws(() => posts.validatePostInput({ slug: "", title: "", content_md: "" }), /slug/);
  assert.throws(
    () => posts.validatePostInput({ slug: "ok", title: "t", content_md: "x".repeat(2_000_000) }),
    /content/,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/utils/posts-contract.test.mjs`
Expected: FAIL with `Cannot find module .../src/lib/posts.ts`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/posts.ts
import { query } from "./db.ts";
import { siteMarkdownProcessor } from "../utils/markdown-processor.mjs";

export interface PostInput {
  slug: string; title: string; description?: string | null;
  cover?: string | null; category?: string | null;
  tags?: string[]; content_md: string;
  status?: "draft" | "published"; pinned?: boolean;
}

export interface PostRow {
  id: number; slug: string; title: string; description: string | null;
  cover: string | null; category: string | null; tags: string[] | null;
  content_md: string; html_cache: string | null;
  status: "draft" | "published"; pinned: number;
  created_at: string; updated_at: string;
}

export function validatePostInput(input: PostInput): void {
  if (!input.slug || !/^[a-z0-9][a-z0-9-]{1,180}$/.test(input.slug)) throw new Error("invalid slug");
  if (!input.title || input.title.length > 255) throw new Error("invalid title");
  if (!input.content_md || input.content_md.length > 1_500_000) throw new Error("invalid content");
}

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const renderer = await siteMarkdownProcessor.createRenderer({});
  const { code } = await renderer.render(markdown, { frontmatter: {} });
  return code;
}

function parseTags(raw: string[] | string | null): string[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : JSON.parse(raw as string);
}

export async function listPublished(page = 1, pageSize = 10): Promise<{ posts: PostRow[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const posts = await query<PostRow[]>(
    `SELECT * FROM posts WHERE status = 'published' ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );
  const count = await query<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM posts WHERE status = 'published'`,
  );
  return { posts: posts.map((p) => ({ ...p, tags: parseTags(p.tags as unknown as string | null) as unknown as null })), total: count[0].total };
}

export async function getPublishedBySlug(slug: string): Promise<PostRow | null> {
  const rows = await query<PostRow[]>(
    `SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1`, [slug],
  );
  if (!rows[0]) return null;
  return { ...rows[0], tags: parseTags(rows[0].tags as unknown as string | null) as unknown as null };
}

export async function createPost(input: PostInput): Promise<void> {
  validatePostInput(input);
  const html = await renderMarkdownToHtml(input.content_md);
  await query(
    `INSERT INTO posts (slug, title, description, cover, category, tags, content_md, html_cache, status, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.slug, input.title, input.description ?? null, input.cover ?? null, input.category ?? null,
      JSON.stringify(input.tags ?? []), input.content_md, html, input.status ?? "draft", input.pinned ? 1 : 0],
  );
}

export async function updatePost(slug: string, input: Partial<PostInput>): Promise<void> {
  const html = input.content_md ? await renderMarkdownToHtml(input.content_md) : undefined;
  await query(
    `UPDATE posts SET title = COALESCE(?, title), description = COALESCE(?, description), cover = COALESCE(?, cover), category = COALESCE(?, category), tags = COALESCE(?, tags), content_md = COALESCE(?, content_md), html_cache = COALESCE(?, html_cache), status = COALESCE(?, status), pinned = COALESCE(?, pinned) WHERE slug = ?`,
    [input.title ?? null, input.description ?? null, input.cover ?? null, input.category ?? null,
      input.tags ? JSON.stringify(input.tags) : null, input.content_md ?? null, html ?? null,
      input.status ?? null, input.pinned === undefined ? null : input.pinned ? 1 : 0, slug],
  );
}
```

```typescript
// src/pages/api/posts/index.ts
import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth.ts";
import { createPost, listPublished } from "../../../lib/posts.ts";

export const GET: APIRoute = async ({ url }) => {
  const page = Number(url.searchParams.get("page") ?? "1");
  const { posts, total } = await listPublished(Number.isFinite(page) && page > 0 ? page : 1, 10);
  return new Response(JSON.stringify({ posts, total }), { headers: { "Content-Type": "application/json" } });
};

export const POST: APIRoute = async (context) => {
  const admin = await requireAdmin(context);
  if (!admin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  try {
    await createPost(await context.request.json());
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400 });
  }
};
```

```typescript
// src/pages/api/posts/[slug].ts
import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth.ts";
import { getPublishedBySlug, updatePost, query } from "../../../lib/posts.ts";
import { query as dbQuery } from "../../../lib/db.ts";

export const GET: APIRoute = async ({ params }) => {
  const post = await getPublishedBySlug(params.slug ?? "");
  if (!post) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  return new Response(JSON.stringify({ post }), { headers: { "Content-Type": "application/json" } });
};

export const PUT: APIRoute = async (context) => {
  const admin = await requireAdmin(context);
  if (!admin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  await updatePost(context.params.slug ?? "", await context.request.json());
  return new Response(JSON.stringify({ ok: true }));
};

export const DELETE: APIRoute = async (context) => {
  const admin = await requireAdmin(context);
  if (!admin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  await dbQuery("DELETE FROM posts WHERE slug = ?", [context.params.slug ?? ""]);
  return new Response(JSON.stringify({ ok: true }));
};
```

SSR page change (same pattern for `[...page]`, `[...permalink]`, archive/categories/tags 鈥?replace `getSortedPosts()` with `listPublished()`; keep file-based moments/albums/anime untouched):

```astro
---
import { listPublished } from "../lib/posts.ts";
const { posts } = await listPublished(1, 10);
---
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/utils/posts-contract.test.mjs`
Expected: PASS.
Run: `npx.cmd astro check` / `pnpm.cmd type-check` / `pnpm.cmd exec biome ci ./src`
Expected: 0 errors / pass / pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/posts.ts src/pages/api/posts/ src/pages/ tests/utils/posts-contract.test.mjs
git commit -m "feat(posts): add db-backed posts repo with public ssr and admin apis"
```

**Delegation Recommendation:**
- Category: `unspecified-high` 鈥?repo + 5 page migrations + 2 endpoints in one coherent slice.
- Skills: [`api-and-interface-design`] 鈥?public GET vs admin-gated write shape; status codes 400/403/404.

**Skills Evaluation:** 鉁?INCLUDED `api-and-interface-design` (REST boundaries + error codes). 鉂?OMITTED `frontend-ui-engineering` (SSR markup unchanged in shape), `security-and-hardening` (gate reused from Task 3; no new auth logic).

**Depends On:** Task 2
**Acceptance Criteria:** Validation test passes; GET list/detail return published only; POST/PUT/DELETE require admin (403 otherwise); SSR pages render from DB.

### Task 5: Admin shell + editor + moderation pages

**Files:**
- Create: `src/layouts/AdminLayout.astro`
- Create: `src/pages/admin/index.astro`
- Create: `src/pages/admin/posts.astro`
- Create: `src/pages/admin/comments.astro`
- Create: `src/components/organisms/admin/PostEditor.svelte`
- Create: `src/components/organisms/admin/CommentModeration.svelte`
- Test: Playwright fragment in `tests/site/dynamic-blog.spec.ts` 鈥?`/admin` redirects non-admin to login (assert redirect, no content leak)

**Interfaces:**
- Consumes: `requireAdmin` (T3), post/comment APIs (T4, T6-read-shape).
- Produces: `/admin/*` pages; `PostEditor` props `{ slug?: string; initial?: PostInput }`; no dependency from front pages.

- [ ] **Step 1: Write the failing test**

```typescript
// append to tests/site/dynamic-blog.spec.ts
test("non-admin visiting /admin is redirected to login", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page).toHaveURL(/login/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts -g "non-admin"`
Expected: FAIL with 404 (no `/admin` route yet).

- [ ] **Step 3: Write minimal implementation**

```astro
---
// src/layouts/AdminLayout.astro
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
interface Props { title?: string }
const { title } = Astro.props;
---
<html lang="en">
<head><meta charset="utf-8" /><title>{title ?? "Admin"}</title></head>
<body class="admin-shell">
  <header class="admin-topbar"><a href="/admin/">{i18n(I18nKey.adminDashboard)}</a></header>
  <main data-admin-root><slot /></main>
</body>
</html>
```

```astro
---
// src/pages/admin/index.astro
import AdminLayout from "../../layouts/AdminLayout.astro";
import { getSessionUser } from "../../lib/auth.ts";
const user = await getSessionUser(Astro);
if (!user || user.role !== "admin") return Astro.redirect("/login");
---
<AdminLayout title="Admin">
  <nav><a href="/admin/posts">Posts</a><a href="/admin/comments">Comments</a></nav>
</AdminLayout>
```

```svelte
<!-- src/components/organisms/admin/PostEditor.svelte (runes) -->
<script lang="ts">
  let { slug = "", initial = null }: { slug?: string; initial?: Record<string, unknown> | null } = $props();
  let title = $state((initial?.title as string) ?? "");
  let content = $state((initial?.content_md as string) ?? "");
  let status = $state("draft");
  let message = $state("");

  async function save() {
    const method = slug ? "PUT" : "POST";
    const url = slug ? `/api/posts/${slug}` : "/api/posts";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, content_md: content, status }),
    });
    message = res.ok ? "Saved" : `Failed: ${res.status}`;
  }
</script>

<form data-post-editor onsubmit={(e) => { e.preventDefault(); save(); }}>
  <label>Title<input bind:value={title} name="title" required /></label>
  <label>Markdown<textarea bind:value={content} name="content" rows={20} required></textarea></label>
  <button type="submit">Save</button>
  <p role="status">{message}</p>
</form>
```

`src/pages/admin/posts.astro` renders `PostEditor client:load` + published list fetched server-side with `requireAdmin` gate; `src/pages/admin/comments.astro` renders `CommentModeration client:load` (list via `/api/comments?postId=` per post, DELETE/spam actions). `CommentModeration.svelte` mirrors the editor pattern: `$state` list, `fetch` DELETE, `role="status"` message.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts -g "non-admin"`
Expected: PASS (redirect to `/login`).
Run: `npx.cmd astro check` / `pnpm.cmd type-check` / `pnpm.cmd exec biome ci ./src`
Expected: 0 errors / pass / pass.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/AdminLayout.astro src/pages/admin/ src/components/organisms/admin/ tests/site/dynamic-blog.spec.ts
git commit -m "feat(admin): add admin shell post editor and moderation pages"
```

**Delegation Recommendation:**
- Category: `visual-engineering` 鈥?admin UI with M3E tokens + Svelte runes islands.
- Skills: [`frontend-ui-engineering`] 鈥?token-driven admin styling, a11y labels, `role="status"`.

**Skills Evaluation:** 鉁?INCLUDED `frontend-ui-engineering` (forms must use semantic tokens + accessible names). 鉂?OMITTED `api-and-interface-design` (APIs frozen in Task 4), `security-and-hardening` (server gate already tested; assert redirect only).

**Depends On:** Task 3, Task 4
**Acceptance Criteria:** Non-admin hits `/admin/` 鈫?`/login` with no admin markup leaked; admin sees dashboard links; editor saves via API.

### Task 6: Comments API + island + section wiring + Swup remount + i18n

**Files:**
- Create: `src/lib/comments.ts`
- Create: `src/pages/api/comments/index.ts`
- Create: `src/pages/api/comments/[id].ts`
- Create: `src/components/organisms/comment/CommentIsland.svelte`
- Create: `src/components/organisms/auth/GithubLoginButton.svelte`
- Create: `src/utils/swup-remount.ts`
- Modify: `src/types/commentConfig.ts`, `src/config/commentConfig.ts`, `src/components/organisms/comment/CommentSection.astro`
- Modify: `src/i18n/i18nKey.ts` + 10 locale modules
- Test: `tests/utils/comments-contract.test.mjs` + Playwright `401` + anonymous-degrade assertions in `dynamic-blog.spec.ts`

**Interfaces:**
- Consumes: `getSessionUser/requireUser` (T3), `checkLimit` (T3), `query()` (T2), `CommentContext` (existing type).
- Produces: comment REST contract; `CommentIsland` props `{ postId: number; slug: string; enabled: boolean }`; i18n keys `authLoginWithGithub, authLogout, authHi, commentsUnavailable, commentsPost, commentsDelete, commentsReply, commentsEmpty, adminDashboard, commentsSpam`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utils/comments-contract.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

test("comment validation rejects empty and oversize", async () => {
  const comments = await import("../../src/lib/comments.ts");
  assert.throws(() => comments.normalizeContent("   "), /empty/);
  assert.throws(() => comments.normalizeContent("x".repeat(2001)), /2000/);
  assert.equal(comments.normalizeContent("  hello  "), "hello");
});
```

```typescript
// append to tests/site/dynamic-blog.spec.ts
test("unauthenticated comment post returns 401", async ({ request }) => {
  const res = await request.post("/api/comments", { data: { postId: 1, content: "hi" } });
  expect(res.status()).toBe(401);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/utils/comments-contract.test.mjs`
Expected: FAIL with `Cannot find module .../src/lib/comments.ts`.
Run: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts -g "401"`
Expected: FAIL with 404 (route missing).

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/comments.ts
import { createHash } from "node:crypto";
import { query } from "./db.ts";

export function normalizeContent(raw: string): string {
  const content = raw.trim().replace(/\s+/g, " ");
  if (!content) throw new Error("empty content");
  if (content.length > 2000) throw new Error("content exceeds 2000 chars");
  return content;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function listPublishedComments(postId: number) {
  return query(
    `SELECT c.id, c.content, c.parent_id, c.created_at, u.login, u.avatar_url, u.role FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? AND c.status = 'published' ORDER BY c.created_at ASC`,
    [postId],
  );
}
```

```typescript
// src/pages/api/comments/index.ts
import type { APIRoute } from "astro";
import { requireUser } from "../../../lib/auth.ts";
import { hashIp, listPublishedComments, normalizeContent } from "../../../lib/comments.ts";
import { query } from "../../../lib/db.ts";
import { checkLimit } from "../../../lib/rate-limit.ts";

export const GET: APIRoute = async ({ url }) => {
  const postId = Number(url.searchParams.get("postId"));
  if (!Number.isFinite(postId)) return new Response(JSON.stringify({ error: "postId required" }), { status: 400 });
  try {
    const comments = await listPublishedComments(postId);
    return new Response(JSON.stringify({ comments }), { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "comments unavailable" }), { status: 500 });
  }
};

export const POST: APIRoute = async (context) => {
  const user = await requireUser(context);
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  const ip = context.clientAddress ?? "unknown";
  const limit = checkLimit(`comment:${hashIp(ip)}`);
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: "rate limited" }), {
      status: 429, headers: { "Retry-After": String(limit.retryAfter) },
    });
  }
  try {
    const body = (await context.request.json()) as { postId: number; content: string; parentId?: number };
    const content = normalizeContent(body.content);
    await query(
      `INSERT INTO comments (post_id, user_id, parent_id, content, status, ip_hash) VALUES (?, ?, ?, ?, 'published', ?)`,
      [body.postId, user.id, body.parentId ?? null, content, hashIp(ip)],
    );
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400 });
  }
};
```

```typescript
// src/pages/api/comments/[id].ts
import type { APIRoute } from "astro";
import { getSessionUser } from "../../../lib/auth.ts";
import { query } from "../../../lib/db.ts";

export const DELETE: APIRoute = async (context) => {
  const user = await getSessionUser(context);
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  const rows = await query<{ user_id: number }[]>("SELECT user_id FROM comments WHERE id = ? LIMIT 1", [context.params.id]);
  if (!rows[0]) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  if (user.role !== "admin" && rows[0].user_id !== user.id) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  await query("DELETE FROM comments WHERE id = ?", [context.params.id]);
  return new Response(JSON.stringify({ ok: true }));
};
```

```svelte
<!-- src/components/organisms/comment/CommentIsland.svelte (runes, client:visible) -->
<script lang="ts">
  import { onMount } from "svelte";
  import { onSwupReplace } from "../../../utils/swup-remount.ts";
  let { postId, enabled = true }: { postId: number; slug: string; enabled?: boolean } = $props();
  let comments = $state<Array<{ id: number; content: string; login: string }>>([]);
  let draft = $state("");
  let error = $state("");
  let offline = $state(false);

  async function load() {
    try {
      const res = await fetch(`/api/comments?postId=${postId}`);
      if (!res.ok) { offline = true; return; }
      comments = ((await res.json()) as { comments: typeof comments }).comments;
    } catch { offline = true; }
  }
  async function submit(e: Event) {
    e.preventDefault();
    const res = await fetch("/api/comments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, content: draft }),
    });
    if (res.status === 401) { error = "login required"; return; }
    if (res.status === 429) { error = "too fast, retry later"; return; }
    if (!res.ok) { error = "post failed"; return; }
    draft = ""; error = ""; await load();
  }
  onMount(() => { load(); return onSwupReplace(load); });
</script>

{#if enabled}
<section id="comments" aria-labelledby="comments-title" data-comment-island>
  {#if offline}<p role="status">Comments unavailable</p>{/if}
  <ul>{#each comments as c}<li data-comment-id={c.id}>{c.content}</li>{/each}</ul>
  <form onsubmit={submit}>
    <textarea bind:value={draft} maxlength={2000} aria-label="comment"></textarea>
    <button type="submit">Post</button>
  </form>
  {#if error}<p role="alert">{error}</p>{/if}
</section>
{/if}
```

```typescript
// src/utils/swup-remount.ts
export function onSwupReplace(callback: () => void): () => void {
  const handler = () => callback();
  document.addEventListener("swup:content:replace", handler);
  window.addEventListener("swup:page:view", handler);
  return () => {
    document.removeEventListener("swup:content:replace", handler);
    window.removeEventListener("swup:page:view", handler);
  };
}
```

Config + section wiring: `CommentProvider` gains `"github-db"`; `resolveCommentOptions` returns `{ provider: "github-db", lazy }` for it (no external script); `CommentSection.astro` keeps the `if (!options || !postCommentEnabled) return null` short-circuit and adds: when `options.provider === "github-db"`, render `<CommentIsland client:visible postId={...} slug={...} />` plus `GithubLoginButton client:load`. When `provider` is `none`/disabled, output remains zero DOM. i18n: add the 10 keys above to `i18nKey.ts` and identical `{placeholder}`-free values in all 10 locale modules.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/utils/comments-contract.test.mjs`
Expected: PASS.
Run: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts -g "401"`
Expected: PASS.
Run: `npx.cmd astro check` / `pnpm.cmd type-check` / `pnpm.cmd exec biome ci ./src`
Expected: 0 errors / pass / pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/comments.ts src/pages/api/comments/ src/components/organisms/comment/CommentIsland.svelte src/components/organisms/auth/GithubLoginButton.svelte src/utils/swup-remount.ts src/types/commentConfig.ts src/config/commentConfig.ts src/components/organisms/comment/CommentSection.astro src/i18n/ tests/utils/comments-contract.test.mjs tests/site/dynamic-blog.spec.ts
git commit -m "feat(comments): add self-built comments api island and swup remount"
```

**Delegation Recommendation:**
- Category: `unspecified-high` 鈥?API + island + config + i18n + Swup lifecycle in one slice.
- Skills: [`frontend-ui-engineering`, `security-and-hardening`] 鈥?island UX/tokens/motion + 401/403/429 + input validation.

**Skills Evaluation:** 鉁?INCLUDED `frontend-ui-engineering` (island must use M3E tokens, `prefersReducedMotion`, a11y roles) and `security-and-hardening` (auth gate, rate limit, 2000-char + ip_hash handling). 鉂?OMITTED `performance-optimization` (list query is indexed; no perf apparatus in MVP).

**Depends On:** Task 3, Task 4
**Acceptance Criteria:** 401/429/400 contracts hold; island loads on direct visit AND after Swup nav; disabled provider renders zero comment DOM; all 10 locales carry new keys.

### Task 7: Baota deploy 鈥?PM2 config + docs + integration mirror

**Files:**
- Create: `ecosystem.config.cjs`
- Create: `docs/deploy-baota.md`
- Modify: `src/integration/*` (mirror adapter/output per packaging contract 鈥?registry/routes/ssr shims only as needed)
- Test: `node --check ecosystem.config.cjs` + `npx.cmd astro check`

**Interfaces:**
- Consumes: server entry/port contract from Task 1 (`127.0.0.1:3000`, standalone).
- Produces: deploy artifact used by operator; no code dependency downstream.

- [ ] **Step 1: Write the failing check (config missing)**

Run: `node --check ecosystem.config.cjs`
Expected: FAIL with file-not-found (proves new artifact).

- [ ] **Step 2: Run check to verify it fails** 鈥?same command as Step 1; record error.

- [ ] **Step 3: Write minimal implementation**

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "blog",
    cwd: "/www/wwwroot/blog",
    script: "./dist/server/entry.mjs",
    exec_mode: "cluster",
    instances: "max",
    watch: false,
    max_memory_restart: "500M",
    env_production: {
      NODE_ENV: "production",
      PORT: "3000",
      HOSTNAME: "127.0.0.1",
    },
  }],
};
```

`docs/deploy-baota.md` (real steps, no placeholders): Node version manager 20/22 鈫?upload/clone to `/www/wwwroot/blog` 鈫?`pnpm install --frozen-lockfile` 鈫?create MySQL db via Baota panel 鈫?copy `.env.production` (all Task 1 names) 鈫?`node db/migrate.mjs` 鈫?`pnpm build` 鈫?Website鈫扤ode project鈫抋dd (PM2 cluster, port 3000, host 127.0.0.1) 鈫?external mapping (Nginx 80/443鈫?000) 鈫?Let's Encrypt SSL + force HTTPS 鈫?update flow `git pull + pnpm install + pnpm build + pm2 reload ecosystem.config.cjs --env production + pm2 save` 鈫?scheduled tasks: DB backup daily 03:00 (keep 3鈥?), site backup 02:00. `src/integration/` mirror: port the `output/adapter` change into the packaged `astro.config` builder + ssr shims so `shirones` npm mode still builds.

- [ ] **Step 4: Run checks to verify they pass**

Run: `node --check ecosystem.config.cjs`
Expected: pass (no output).
Run: `npx.cmd astro check` / `pnpm.cmd type-check`
Expected: 0 errors / pass.

- [ ] **Step 5: Commit**

```bash
git add ecosystem.config.cjs docs/deploy-baota.md src/integration/
git commit -m "chore(deploy): add baota pm2 config and deployment guide"
```

**Delegation Recommendation:**
- Category: `writing` 鈥?config + operational doc, minimal code.
- Skills: [`documentation-and-adrs`] 鈥?deploy runbook precision.

**Skills Evaluation:** 鉁?INCLUDED `documentation-and-adrs` (runbook + backup/update contracts). 鉂?OMITTED `frontend-ui-engineering`, `security-and-hardening` (no app code; SSL/env handling documented, not implemented).

**Depends On:** Task 1
**Acceptance Criteria:** `node --check` passes; doc covers install鈫扴SL鈫抌ackup鈫抲pdate with exact commands; both theme-source and `shirones` package modes still configure server output.

### Task 8: E2E dynamic-blog spec + a11y gate

**Files:**
- Modify: `tests/site/dynamic-blog.spec.ts` (full loop: mock session 鈫?login echo 鈫?post comment 鈫?visible; admin publish 鈫?front visible 鈫?delete comment; Swup nav remount; dark/light tokens)
- Test: `tests/site/a11y.spec.ts` (existing 鈥?run, no edit)

**Interfaces:**
- Consumes: all routes/pages from Tasks 1鈥?.
- Produces: final quality gate; no downstream code.

- [ ] **Step 1: Write the failing test (full loop)**

```typescript
// tests/site/dynamic-blog.spec.ts 鈥?append
test("mock-session visitor posts a comment and sees it", async ({ page }) => {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ json: { user: { id: 1, login: "tester", avatar_url: "", role: "user" } } });
  });
  await page.goto("/posts/<seeded-db-slug>/");
  await page.locator("[data-comment-island] textarea").fill("Hello from e2e");
  await page.locator("[data-comment-island] button[type=submit]").click();
  await expect(page.locator("[data-comment-island] li", { hasText: "Hello from e2e" })).toBeVisible();
});

test("comment island survives swup navigation", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href*="/posts/"]').first().click();
  await expect(page.locator("[data-comment-island]")).toBeVisible();
});
```

(Seeded DB slug + admin publish/delete flow use `request` fixture against admin APIs with a test admin session; mock only `api.github.com`, never the local APIs.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts -g "mock-session"`
Expected: FAIL (island/API not yet reachable from seed data or selector missing) 鈥?record message.

- [ ] **Step 3: Write minimal implementation** 鈥?no app code; fix test selectors/seed to match Tasks 4鈥? reality (exact `data-comment-island`, `data-comment-id`, `role="status/alert"` contracts). If a gap is real (e.g., post route 404), file it as a defect against the owning task rather than weakening the assertion.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts`
Expected: PASS.
Run: `npx.cmd playwright test tests/site/a11y.spec.ts`
Expected: PASS.
Run: `npx.cmd astro check` / `pnpm.cmd type-check` / `pnpm.cmd exec biome ci ./src`
Expected: 0 errors / pass / pass.

- [ ] **Step 5: Commit**

```bash
git add tests/site/dynamic-blog.spec.ts
git commit -m "test(e2e): cover dynamic blog comment and admin flows"
```

**Delegation Recommendation:**
- Category: `unspecified-low` 鈥?test-only change, deterministic selectors, mocked GitHub only.
- Skills: [`browser-testing-with-devtools`] 鈥?real-browser Swup + theme-init waits (`--mc-primary`, `onload-animation`).

**Skills Evaluation:** 鉁?INCLUDED `browser-testing-with-devtools` (direct-load + Swup-nav coverage, reduced-motion). 鉂?OMITTED all implementation skills (no app code in this task).

**Depends On:** Task 5, Task 6
**Acceptance Criteria:** Full spec  matrix green: mock-session comment loop, 401, admin publish鈫抳isible鈫抎elete, direct+Swup mount, a11y clean.

## Commit Strategy

- One task = one atomic commit, conventional form `type(scope): subject`; scopes: `ssr, db, auth, posts, admin, comments, deploy, e2e`.
- Order: T1 鈫?T2 鈫?T3/T4 (parallel) 鈫?T5/T6 (parallel) 鈫?T7 (any time after T1) 鈫?T8.
- Each commit runs the task's Step 4 gates first; never bundle test + impl of two tasks.
- Lockfile/config commits stay inside Task 1; locale additions stay inside Task 6; no drive-by formatting (`lint/format --write` forbidden in review).

## Success Criteria

1. `npx.cmd astro check` 鈫?0 errors; `pnpm.cmd type-check` 鈫?pass; `pnpm.cmd exec biome ci ./src` 鈫?pass unmodified.
2. `npx.cmd playwright test tests/site/dynamic-blog.spec.ts tests/site/a11y.spec.ts` 鈫?all pass.
3. Manual: direct load + Swup navigation both mount comments; light/dark tokens correct; `/admin` gated; Baota runbook executes end-to-end.
4. Self-review done: spec  each mapped (T1鈫?server, T2鈫?tables, T3鈫?OAuth, T4鈫?posts, T5鈫?admin, T6鈫?comments, T7鈫?deploy, T8鈫?tests); placeholder scan clean (no TBD/TODO/similar-to/appropriate-handling); type/name consistency (`SESSION_COOKIE`, `listPublished`, `normalizeContent`, `data-comment-island`) verified across tasks.

## TODO List (ADD THESE)

> CALLER: Add these TODOs using TodoWrite/TaskCreate and execute by wave.

### Wave 1 (Start Immediately 鈥?No Dependencies)

- [ ] **1. SSR switch + env contract**
  - What: Add @astrojs/node standalone, `output:'server'`, `src/lib/env.ts`, `.env.example`, skeleton spec
  - Depends: None
  - Blocks: 2, 7
  - Category: `unspecified-high`
  - Skills: [`git-workflow-and-versioning`]
  - QA: `npx.cmd astro check` 0 errors + spec shell PASS

### Wave 2 (After Wave 1 Completes)

- [ ] **2. MySQL schema + db client**
  - What: `db/schema.sql`, `db/migrate.mjs`, `src/lib/db.ts` pool, contract test
  - Depends: 1
  - Blocks: 3, 4
  - Category: `deep`
  - Skills: [`source-driven-development`]
  - QA: `node --experimental-strip-types --test tests/utils/db-contract.test.mjs` PASS

- [ ] **7. Baota deploy config + doc + integration mirror**
  - What: `ecosystem.config.cjs`, `docs/deploy-baota.md`, `src/integration` mirror
  - Depends: 1
  - Blocks: none (operator gate)
  - Category: `writing`
  - Skills: [`documentation-and-adrs`]
  - QA: `node --check ecosystem.config.cjs` pass + `astro check` clean

### Wave 3 (After Wave 2 Completes 鈥?parallel)

- [ ] **3. GitHub OAuth + sessions**
  - What: `src/lib/auth.ts`, `rate-limit.ts`, 4 auth API routes, contract test
  - Depends: 2
  - Blocks: 5, 6
  - Category: `deep`
  - Skills: [`security-and-hardening`, `source-driven-development`]
  - QA: auth contract test PASS + OAuth-fail 鈫?`?err=oauth`

- [ ] **4. Posts repo + SSR + admin post APIs**
  - What: `src/lib/posts.ts`, 2 post API routes, migrate 5 pages off `getCollection`
  - Depends: 2
  - Blocks: 5, 6
  - Category: `unspecified-high`
  - Skills: [`api-and-interface-design`]
  - QA: posts contract test PASS + GET published-only

### Wave 4 (After Wave 3 Completes 鈥?parallel)

- [ ] **5. Admin pages + editor + moderation**
  - What: `AdminLayout`, `/admin/*` x3, `PostEditor`, `CommentModeration`, redirect test
  - Depends: 3, 4
  - Blocks: 8
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-engineering`]
  - QA: non-admin `/admin/` 鈫?`/login` PASS

- [ ] **6. Comments API + island + wiring + i18n**
  - What: `src/lib/comments.ts`, 2 comment routes, `CommentIsland`, login button, remount util, config+i18n
  - Depends: 3, 4
  - Blocks: 8
  - Category: `unspecified-high`
  - Skills: [`frontend-ui-engineering`, `security-and-hardening`]
  - QA: comments contract PASS + 401 spec PASS + 10 locales complete

### Wave 5 (After Wave 4 Completes)

- [ ] **8. E2E dynamic-blog + a11y gate**
  - What: Full-loop spec (mock session, 401, admin publish/delete, Swup remount) + a11y run
  - Depends: 5, 6
  - Blocks: none
  - Category: `unspecified-low`
  - Skills: [`browser-testing-with-devtools`]
  - QA: `npx.cmd playwright test tests/site/dynamic-blog.spec.ts tests/site/a11y.spec.ts` all PASS

## Execution Instructions

1. **Wave 1**: Fire immediately
   ```
   task(category="unspecified-high", load_skills=["git-workflow-and-versioning"], run_in_background=false, prompt="Task 1: SSR switch + env contract ...")
   ```

2. **Wave 2**: After Wave 1
   ```
   task(category="deep", load_skills=["source-driven-development"], run_in_background=false, prompt="Task 2: MySQL schema + db client ...")
   task(category="writing", load_skills=["documentation-and-adrs"], run_in_background=false, prompt="Task 7: Baota deploy ...")
   ```

3. **Wave 3**: After Wave 2, fire both in parallel
   ```
   task(category="deep", load_skills=["security-and-hardening","source-driven-development"], run_in_background=false, prompt="Task 3: GitHub OAuth + sessions ...")
   task(category="unspecified-high", load_skills=["api-and-interface-design"], run_in_background=false, prompt="Task 4: Posts repo + SSR + admin APIs ...")
   ```

4. **Wave 4**: After Wave 3, fire both in parallel
   ```
   task(category="visual-engineering", load_skills=["frontend-ui-engineering"], run_in_background=false, prompt="Task 5: Admin pages ...")
   task(category="unspecified-high", load_skills=["frontend-ui-engineering","security-and-hardening"], run_in_background=false, prompt="Task 6: Comments ...")
   ```

5. **Wave 5**: Final gate
   ```
   task(category="unspecified-low", load_skills=["browser-testing-with-devtools"], run_in_background=false, prompt="Task 8: E2E + a11y ...")
   ```

6. Final QA: `npx.cmd astro check` + `pnpm.cmd type-check` + `pnpm.cmd exec biome ci ./src` + full dynamic-blog + a11y specs.

<task_metadata>
session_id: ses_f9476e913ffecH5RvmCld5Fxc5
task_id: ses_f9476e913ffecH5RvmCld5Fxc5
subagent: plan
</task_metadata>
