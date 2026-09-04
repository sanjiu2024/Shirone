# Deploy on Baota (PM2 cluster + Nginx + MySQL)

Runbook for deploying the SSR blog (`output: 'server'`, `@astrojs/node` standalone)
on a Baota panel host. The Node process binds **only** `127.0.0.1:3000`;
public traffic reaches it through the Nginx reverse proxy (80/443 to 3000).

## 1. Prerequisites

- Baota panel with **Node version manager**, **Nginx**, and **MySQL** (5.7+ / 8.0+) installed.
- A domain with DNS A records pointing at this server.

## 2. Install Node 20/22

1. Open the Baota panel: **Software Store** > **Node version manager**.
2. Install **Node 20** or **Node 22** (server runtime requires Node >= 22.12;
   use 22 if available, 20 at minimum for tooling).
3. Set it as the default/command-line version so `node -v` reports the new version.

Optional npm mirror (faster installs on CN networks):

```bash
npm config set registry https://registry.npmmirror.com
```

## 3. Upload the site to `/www/wwwroot/blog`

Clone or upload the repository to the exact server path used by
`ecosystem.config.cjs`:

```bash
cd /www/wwwroot
git clone <your-repo-url> blog
cd /www/wwwroot/blog
```

Prefer `git clone` so later updates are a plain `git pull`.

## 4. Install dependencies

```bash
cd /www/wwwroot/blog
pnpm install --frozen-lockfile
```

## 5. Create the MySQL database

1. Baota panel: **Database** > **Add database**.
2. Create database `blog` with a dedicated user and strong password.
   Record the host (`127.0.0.1`), port (`3306`), database name, user, and password.

## 6. Create `.env.production` on the server

Create `/www/wwwroot/blog/.env.production` **directly on the server**.
It is never committed to git. Use the exact variable names from `.env.example`:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=<baota-mysql-user>
DB_PASSWORD=<baota-mysql-password>
DB_NAME=blog
AUTH_GITHUB_ID=<github-oauth-client-id>
AUTH_GITHUB_SECRET=<github-oauth-client-secret>
AUTH_SECRET=<random-32-byte-secret>
ADMIN_GITHUB_ID=<your-numeric-github-user-id>
PUBLIC_SITE_URL=https://<domain>
PORT=3000
HOSTNAME=127.0.0.1
```

Keep `PORT=3000` and `HOSTNAME=127.0.0.1`.
The app must not listen on `0.0.0.0` or any other port.

## 7. Run the migration and build

```bash
cd /www/wwwroot/blog
node db/migrate.mjs
pnpm build
```

`node db/migrate.mjs` applies `db/schema.sql` (idempotent).
`pnpm build` produces `dist/server/entry.mjs`, the PM2 entry.

## 8. Add the Node project (PM2 cluster)

1. Baota panel: **Website** > **Node project** > **Add Node project**.
2. Project directory: `/www/wwwroot/blog`.
3. Startup file / entry: `./dist/server/entry.mjs`.
4. Project port: `3000`, bind address / host: `127.0.0.1`.
5. Startup mode: **PM2 cluster** (`exec_mode=cluster, instances=max`),
   auto-start on boot enabled.
6. Environment: `production` (loads `env_production` from `ecosystem.config.cjs`).

Alternatively, from the command line:

```bash
cd /www/wwwroot/blog
pm2 start ecosystem.config.cjs --env production
pm2 save
```

## 9. External mapping (Nginx 80/443 to 3000)

1. In the Node project settings, enable **external mapping** / domain binding.
2. Map the domain to the upstream `127.0.0.1:3000`.
3. Baota generates the Nginx reverse proxy for ports 80 and 443.
   Do not expose port 3000 directly.

## 10. SSL: Let's Encrypt + force HTTPS

1. Baota panel: **Website** > your site > **SSL** > **Let's Encrypt**.
2. Apply a certificate for the domain.
3. Enable **force HTTPS** so all port-80 traffic redirects to 443.

OAuth callback URL registered on GitHub must be
`https://<domain>/api/auth/callback/github`.

## 11. Firewall

1. Baota panel: **Security** > firewall: allow ports **80** and **443**.
2. Keep port **3000 closed** to the outside; it is reachable only via
   `127.0.0.1` from Nginx on the same host.
3. Keep MySQL port **3306 closed** to the outside.

## 12. Backups (plan tasks)

- **Database**: scheduled task, daily at **03:00**, back up the `blog`
  database, keep recent copies (3 or more).
- **Site files**: scheduled task at **02:00**, back up `/www/wwwroot/blog`
  (includes `.env.production`).

Baota panel: **Cron** > add shell-based scheduled tasks for each backup above.

## 13. Update flow

```bash
cd /www/wwwroot/blog
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 reload ecosystem.config.cjs --env production
pm2 save
```

No downtime beyond the reload; verify the site and the `/admin` gate afterwards.
