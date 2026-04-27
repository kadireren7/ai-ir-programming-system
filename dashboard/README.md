# Torqa Dashboard (MVP)

Next.js **App Router** + **Tailwind CSS** + **shadcn/ui** + **Recharts** (via shadcn `Chart`). Uses **mock data** under `src/data/` with a **`queries.ts`** facade so you can swap in Supabase or REST without rewriting pages.

## Run locally

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Page |
| --- | --- |
| `/` | Marketing landing page |
| `/overview` | Dashboard overview (stats, risk chart, recent runs) |
| `/projects` | Projects grid |
| `/scan` | **Workflow scan** — upload/paste JSON, pick generic vs n8n, run **`POST /api/scan`**; saves history when Supabase auth is configured; **`?library=<id>`** loads a saved template from the library |
| `/workflow-library` | **Workflow library** — upload JSON, save/rename/delete templates; **Scan** opens `/scan?library=…` (Supabase `workflow_templates` or browser **localStorage** when env is unset) |
| `/workspace` | **Team workspace** — create org, set **active workspace** cookie, invite admins/members, list members; shared **`scan_history`** / templates when cookie is set (see migration `20260426210000_workspace_shared_scans_invites.sql`) |
| `/scan/history` | **Saved scans** — table of past reports (RLS: your rows only) |
| `/scan/[id]` | **Re-open a report** — read-only view of a saved `scan_history` row; **Share report** creates a public link |
| `/share/[shareId]` | **Public shared scan** — no login; labeled as shared report (Supabase RPC + anon key) |
| `/login` | **Email sign-in / sign-up** (Supabase Auth); optional when env vars are unset (local/CI) |
| `/auth/callback` | **OAuth / email-confirm** exchange route for Supabase |
| `/api/scan` | **POST** — body `{ "source": "n8n" \| "generic", "content": { … } }` → JSON result; `engine` comes from the active **scan provider** (default `server-preview`) |
| `/api/scans` | **POST** (authenticated) — persist a scan result to `scan_history` |
| `/api/scans/[scanId]/share` | **POST** (authenticated) — mint or reuse `share_id`, returns `shareUrl` (copied client-side) |
| `/api/share/[shareId]` | **GET** (public) — JSON snapshot `{ result, source, workflow_name, created_at }` for integrations |
| `/api/workflow-templates` | **GET** (authenticated) — list templates; **POST** — create `{ name, source, content }` |
| `/api/workflow-templates/[id]` | **GET** / **PATCH** (rename) / **DELETE** — own row only (RLS) |
| `/api/workspaces` | **GET** list memberships · **POST** create `{ name, slug }` (RPC `create_organization`) |
| `/api/workspaces/active` | **GET** current active workspace id · **POST** `{ organizationId }` \| `null` — httpOnly **`torqa_active_org`** cookie scopes scans / history / library / home metrics |
| `/api/workspaces/[orgId]/members` | **GET** — RPC `workspace_members` (emails + roles) |
| `/api/workspaces/[orgId]/invites` | **GET** pending · **POST** `{ email, role }` — `invite_organization_member` |
| `/api/workspaces/[orgId]/members/[userId]` | **PATCH** `{ role }` (admin/member) · **DELETE** remove member |
| `/api/workspaces/[orgId]/ownership` | **POST** transfer ownership (owner only) |
| `/api/workspaces/[orgId]/settings` | **PATCH** rename workspace · **DELETE** delete workspace (owner only) |
| `/api/workspaces/[orgId]/leave` | **POST** leave workspace (non-owner) |
| `/api/workspaces/[orgId]/activity` | **GET** workspace activity feed |
| `/api/invites/accept` | **POST** `{ token }` — `accept_organization_invite` (signed-in email must match invite) |
| `/workspace/activity` | Workspace collaboration activity feed (joins, invites, role changes, scans, shares, API keys, etc.) |
| `/notifications` | **In-app notifications** — scan alerts (FAIL / high-risk); localStorage when Supabase is off |
| `/settings/notifications` | **Scan alert settings** — toggles, trust-score threshold, email + Slack webhook placeholders |
| `/settings/api` | **User API** — generate/revoke API keys, copy one-time secret, and inspect usage logs |
| `/api/notifications` | **GET** list + `unreadCount` (or `?count=1` unread only) |
| `/api/notifications/[id]` | **PATCH** `{ read: true }` |
| `/api/settings/notifications` | **GET** / **PATCH** — `notification_preferences` (requires migration `20260426220000_scan_notifications.sql`) |
| `/api/settings/api-keys` | **GET** list keys + recent usage · **POST** create key `{ name }` (raw key returned once) |
| `/api/settings/api-keys/[id]` | **PATCH** `{ revoke: true }` — revokes an active key |
| `/api/public/scan` | **POST** (public with API key) — same body as `/api/scan`; key auth via `x-api-key` or Bearer |
| `/validation` | Validation history table |
| `/validation/[runId]` | Run detail + mock JSON |
| `/policy` | Policy settings |
| `/team` | Team members |

## Production build

```bash
npm run build
npm start
```

### `/scan` — scan providers (`TORQA_SCAN_PROVIDER`)

- **Default (`server-preview`):** The page calls **`POST /api/scan`**. The route uses the **`server-preview`** provider (`src/lib/scan/providers/server-preview.ts`), which wraps deterministic heuristics in **`src/lib/scan-engine.ts`** (Node runtime): n8n-shaped exports (HTTP Request, Code, credentials, error-handling hints, webhook/slack/email side effects). Response shape is unchanged: `status`, `riskScore`, `findings`, `totals`, and **`engine: "server-preview"`**. This is **not** the Torqa Python package or CLI.
- **Switching providers:** Set **`TORQA_SCAN_PROVIDER`** on the server (default **`server-preview`**). Unknown values return **400** with a list of valid ids.
- **`hosted-python`:** Set **`TORQA_SCAN_PROVIDER=hosted-python`** and **`TORQA_ENGINE_URL`** to the base URL of your Torqa Python HTTP service (no trailing slash required). The dashboard **`POST`s `{ source, content }` to `{TORQA_ENGINE_URL}/scan`** and maps the JSON body into the same **`ScanApiSuccess`** shape with **`engine: "hosted-python"`**. If the URL is unset, the request fails, or the response is not a valid scan payload, the route **falls back** to the same deterministic **`server-preview`** analysis so the UI keeps working. The engine should return JSON with **`findings`** (array of `severity`, `rule_id`, `target`, `explanation`, `suggested_fix`), plus **`status`** (`PASS` \| `NEEDS REVIEW` \| `FAIL`) or **`decision`**, **`riskScore`**, **`source`**, and optional **`totals`** (otherwise totals are derived from findings).
- **`python-engine`:** Stub only — returns **503** until wired (see `src/lib/scan/providers/python-engine.ts`).
- **Auth & history:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, apply migrations (including `scan_history`), then use **`/login`** to sign up or sign in. **`middleware.ts`** protects app routes when those env vars are present. After each successful scan, the client calls **`POST /api/scans`** to persist the result (same JSON) for **`/scan/history`** and **`/scan/[id]`**.
- **Share links (optional, Supabase-backed):** Apply migration `20260426150000_scan_history_share_id.sql` (column `share_id` + `get_scan_by_share_id` RPC). Owners can **`POST /api/scans/[scanId]/share`** to mint a token and copy **`/share/[shareId]`**. Public access does **not** open `scan_history` to anonymous table reads — only the **SECURITY DEFINER** RPC returns one row for a valid token. **`/share/*`** is excluded from auth middleware so links work without login.
- **Local / CI without Supabase:** Leave the env vars unset — the dashboard stays reachable without a login gate; scan still works; history UI explains that Supabase is not configured.
- **Samples:** Static workflows ship under `public/scan-samples/` for Vercel deploys (middleware allows `/scan-samples/*` without a session).

## Next steps (integration)

- Replace `src/data/queries.ts` with Supabase client calls (see repo `docs/cloud-backend.md`).
- Add auth (Supabase Auth or NextAuth) and gate `(app)` layout.
- Point “Run” JSON panel at `reports.payload` or Storage signed URLs.
