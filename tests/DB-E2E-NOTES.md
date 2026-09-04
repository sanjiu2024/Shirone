# DB E2E Notes (Baota handoff)

Local Windows dev has no MySQL/Docker, so live-DB Playwright cannot go green
here. Everything DB-less was verified locally (see matrix below); the rest
runs on Baota after the database is migrated.

## Run on Baota

```bash
node db/migrate.mjs
npx playwright test tests/site/dynamic-blog.spec.ts tests/site/a11y.spec.ts
```

- `dynamic-blog.spec.ts` test 1 ("SSR server responds with dynamic shell")
  renders `/` through `[...permalink]` -> `listPublished`, so it needs MySQL +
  migrated schema. Tests 2-3 (401, admin redirect) are DB-less and already
  pass locally.
- `trailingSlash: "always"` is set in `astro.config.mjs`: every probe/spec URL
  needs its trailing slash (`/login/`, `/api/comments/`, `/admin/`).
  Slash-less URLs 404 at the router before reaching handlers.

## Playwright fragments (verified locally 2026-09-04)

`npx playwright test tests/site/dynamic-blog.spec.ts` — tests 2+3 pass
DB-less against a manual `astro dev` server with dummy env:

- "unauthenticated comment post returns 401" — green (spec uses the
  trailing-slash URL `/api/comments/`).
- "non-admin visiting /admin is redirected to login" — green (redirect chain
  lands on a `/login/` URL).

Test 1 ("SSR server responds with dynamic shell") needs live MySQL; the
config `webServer` readiness probe (`/`) also needs it, so local runs use a
manually started server + a webServer-less Playwright config. Local quirk:
the dev watcher intermittently crashes on `lstat D:\System Volume
Information` (repo sits at drive root); `CHOKIDAR_USEPOLLING=true` keeps the
manual server alive for the run. `pnpm build` is independently broken here
(pre-existing `@astrojs/node` 8.3.4 vs `astro` 7.2.6 `applyPolyfills`
mismatch) — Baota should confirm the build after migrating.

## Local DB-less matrix (dummy env: `DB_*=dummy`, `AUTH_*=dummy`, …)

| Probe                           | Result (local, no MySQL)                    | Expected on Baota        |
| ------------------------------- | ------------------------------------------- | ------------------------ |
| `POST /api/comments/` no cookie | 401                                         | 401                      |
| `GET /api/comments/?postId=abc` | 400                                         | 400                      |
| `GET /admin/`                   | 302 `Location: /login`, empty body          | 302 `/login`, empty body |
| `GET /login/`                   | 200                                         | 200                      |
| `GET /login/?err=oauth`         | 200 + `data-login-error` alert              | 200 + alert              |
| `GET /nope/`                    | 500 (DB ECONNREFUSED in permalink resolver) | 404                      |
| `GET /api/auth/github/`         | 302 `github.com/login/oauth/authorize?...`  | 302 github.com           |
| `GET /`                         | 500 (no DB)                                 | 200 dynamic shell        |

Contract suite: `node --test tests/utils/db-contract.test.mjs
tests/utils/auth-contract.test.mjs tests/utils/posts-contract.test.mjs
tests/utils/comments-contract.test.mjs` — 6/6 pass with dummy env
(the `DB_PASSWORD` test requires the other dummy vars present since
`getEnv` checks `DB_USER` first). `npx astro check` — 0 errors.
