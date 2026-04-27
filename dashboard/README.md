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
| `/insights` | **Team insights & ROI** — aggregates **`scan_history.result`** (engine status, findings, optional **`policyEvaluation`**): volume, critical-class findings, policy FAIL rate, trust trend, top rules/workflows, policy outcomes, member contribution; **demo mode** when Supabase is off or user is logged out |
| `/projects` | Projects grid |
| `/scan` | **Workflow scan** — upload/paste JSON, pick generic vs n8n, optional **governance policy**; run **`POST /api/scan`**; saves history when Supabase auth is configured; **`?library=<id>`** loads a saved template from the library |
| `/policies` | **Policy templates** — browse built-in templates (also available statically without DB), create **workspace policies** when Supabase is on, edit thresholds (trust floor, critical handling, review caps, hygiene flags), enable/disable |
| `/integrations` | **Integrations foundation** — n8n integration config (safe placeholder), with GitHub/Zapier/Make marked coming soon |
| `/schedules` | **Scheduled scans** — create schedules against workflow templates (or integration placeholders); **Run now** executes the scan server-side and saves **`scan_history`**; background cron is optional (see `TORQA_CRON_SECRET` + `/api/scan-schedules/cron/tick`) |
| `/workflow-library` | **Workflow library** — upload JSON, save/rename/delete templates; **Scan** opens `/scan?library=…` (Supabase `workflow_templates` or browser **localStorage** when env is unset) |
| `/workspace` | **Team workspace** — create org, set **active workspace** cookie, invite admins/members, list members; shared **`scan_history`** / templates when cookie is set (see migration `20260426210000_workspace_shared_scans_invites.sql`) |
| `/scan/history` | **Saved scans** — table of past reports (RLS: your rows only) |
| `/scan/[id]` | **Re-open a report** — read-only view of a saved `scan_history` row; **Share report** creates a public link |
| `/share/[shareId]` | **Public shared scan** — no login; labeled as shared report (Supabase RPC + anon key) |
| `/login` | **Email sign-in / sign-up** (Supabase Auth); optional when env vars are unset (local/CI) |
| `/auth/callback` | **OAuth / email-confirm** exchange route for Supabase |
| `/api/scan` | **POST** — body `{ "source", "content", "workspacePolicyId"?, "policyTemplateSlug"? }` → scan JSON; when a policy resolves, response includes **`policyEvaluation`** (`policyStatus`, `violations`, `appliedPolicyName`, `recommendations`) without changing engine **`status`** / findings |
| `/api/policy-templates` | **GET** — built-in + DB-backed **`policy_templates`** (falls back to static built-ins if Supabase is off or query fails) |
| `/api/workspace-policies` | **GET** / **POST** — list or create saved policies for the active workspace (or personal) scope |
| `/api/workspace-policies/[id]` | **PATCH** / **DELETE** — update name, `enabled`, merged **`config`** thresholds, optional **`templateSlug`** |
| `/api/insights` | **GET** — query params: **`scope`** (`workspace` or `personal`), **`days`** (7 / 30 / 90), **`status`**, **`policyGate`**, **`policyName`**; returns aggregated metrics JSON (live from **`scan_history`** or **demo** when cloud/auth unavailable) |
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
| `/alerts` | **Team alerts** — `alert_destinations` (Slack / Discord / email placeholder / in-app) + `alert_rules` (FAIL, NEEDS REVIEW, high-severity, schedule failure); webhook URLs masked after save |
| `/settings/notifications` | **Scan alert settings** — toggles, trust-score threshold, email + Slack webhook placeholders |
| `/settings/api` | **User API** — generate/revoke API keys, copy one-time secret, and inspect usage logs |
| `/api/notifications` | **GET** list + `unreadCount` (or `?count=1` unread only) |
| `/api/notifications/[id]` | **PATCH** `{ read: true }` |
| `/api/settings/notifications` | **GET** / **PATCH** — `notification_preferences` (requires migration `20260426220000_scan_notifications.sql`) |
| `/api/settings/api-keys` | **GET** list keys + recent usage · **POST** create key `{ name }` (raw key returned once) |
| `/api/settings/api-keys/[id]` | **PATCH** `{ revoke: true }` — revokes an active key |
| `/api/public/scan` | **POST** (public with API key) — same body as `/api/scan` plus optional **`policyTemplateSlug`** or a **personal** **`workspacePolicyId`** (owned by the API key user); key auth via `x-api-key` or Bearer |
| `/api/integrations` | **GET** list active-scope integrations · **POST** create integration (n8n available in MVP) |
| `/api/integrations/[id]` | **PATCH** update integration metadata/status · **DELETE** remove integration |
| `/api/scan-schedules` | **GET** list schedules for active workspace scope · **POST** create `{ name, scopeType, scopeId, frequency, enabled?, workspacePolicyId? }` |
| `/api/scan-schedules/[id]` | **PATCH** update name/frequency/enabled/**`workspacePolicyId`** · **DELETE** remove schedule (cascades runs) |
| `/api/scan-schedules/[id]/run` | **POST** manual run — template scope loads JSON, runs scan provider, persists **`scan_history`**, writes **`scan_schedule_runs`**, updates schedule timestamps + notifications |
| `/api/scan-schedules/cron/tick` | **POST** (future) — `Authorization: Bearer $TORQA_CRON_SECRET`; stub until automatic execution is wired |
| `/api/alert-destinations` | **GET** / **POST** — team alert channels for active workspace or personal scope |
| `/api/alert-destinations/[id]` | **PATCH** / **DELETE** — update enabled/name/config (webhook URL not echoed back) |
| `/api/alert-destinations/[id]/test` | **POST** — send a safe test ping to Slack / Discord / in-app (email placeholder no-op) |
| `/api/alert-rules` | **GET** / **POST** — list or create rules mapping triggers → destination ids |
| `/api/alert-rules/[id]` | **PATCH** / **DELETE** — update or remove a rule |
| `/validation` | Validation history table |
| `/validation/[runId]` | Run detail + mock JSON |
| `/policy` | Legacy **policy settings** (mock bindings UI) |
| `/team` | Team members |

## Production build

```bash
npm run build
npm start
```

### Policy templates & evaluation

- **Migration:** `supabase/migrations/20260428220000_policy_templates_workspace_policies.sql` — `policy_templates`, `workspace_policies`, RLS, seed rows, and optional **`scan_schedules.workspace_policy_id`**.
- **Built-ins:** `startup-baseline`, `strict-security`, `agency-client-safe`, `enterprise-governance`, `n8n-production` (see `src/lib/built-in-policy-templates.ts` and the migration seed — keep them aligned).
- **Evaluator:** `src/lib/policy-evaluator.ts` consumes **`ScanApiSuccess`** + merged threshold config and returns **`policyEvaluation`**. Resolver: `src/lib/resolve-scan-policy.ts` (template slug and/or saved workspace policy; public API keys restrict workspace policies to **personal** rows).
- **Examples:** **`POST /api/scan`** with `{ "source": "n8n", "content": { … }, "policyTemplateSlug": "strict-security" }` — or create a workspace policy on **`/policies`** and send **`workspacePolicyId`**. Scheduled **Run now** applies the schedule’s linked policy and persists **`policyEvaluation`** inside **`scan_history.result`**.

### Team insights (`/insights`)

- **Purpose:** B2B-style ROI framing on top of saved scans — not a separate telemetry product; all metrics derive from persisted **`scan_history`** rows.
- **Engine vs policy:** KPIs use **`result.status`**, **`result.riskScore`**, **`result.findings`** (critical-class = high + critical severities), and **`result.policyEvaluation`** when scans were run with a policy.
- **Implementation:** `GET /api/insights` loads scoped rows (workspace = active org, personal = `organization_id` null), caps volume (~3.5k recent rows), and aggregates in **`src/lib/insights-aggregate.ts`**. **`src/lib/insights-mock.ts`** feeds deterministic **demo** data when env/auth is missing so the page stays polished in local/CI.

### `/scan` — scan providers (`TORQA_SCAN_PROVIDER`)

- **Default (`server-preview`):** The page calls **`POST /api/scan`**. The route uses the **`server-preview`** provider (`src/lib/scan/providers/server-preview.ts`), which wraps deterministic heuristics in **`src/lib/scan-engine.ts`** (Node runtime): n8n-shaped exports (HTTP Request, Code, credentials, error-handling hints, webhook/slack/email side effects). Response shape is unchanged: `status`, `riskScore`, `findings`, `totals`, and **`engine: "server-preview"`**. This is **not** the Torqa Python package or CLI.
- **Switching providers:** Set **`TORQA_SCAN_PROVIDER`** on the server (default **`server-preview`**). Unknown values return **400** with a list of valid ids.
- **`hosted-python`:** Set **`TORQA_SCAN_PROVIDER=hosted-python`** and **`TORQA_ENGINE_URL`** to the base URL of your Torqa Python HTTP service (no trailing slash required). The dashboard **`POST`s `{ source, content }` to `{TORQA_ENGINE_URL}/scan`** and maps the JSON body into the same **`ScanApiSuccess`** shape with **`engine: "hosted-python"`**. If the URL is unset, the request fails, or the response is not a valid scan payload, the route **falls back** to the same deterministic **`server-preview`** analysis so the UI keeps working. The engine should return JSON with **`findings`** (array of `severity`, `rule_id`, `target`, `explanation`, `suggested_fix`), plus **`status`** (`PASS` \| `NEEDS REVIEW` \| `FAIL`) or **`decision`**, **`riskScore`**, **`source`**, and optional **`totals`** (otherwise totals are derived from findings).
- **`python-engine`:** Stub only — returns **503** until wired (see `src/lib/scan/providers/python-engine.ts`).
- **Auth & history:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, apply migrations (including `scan_history`), then use **`/login`** to sign up or sign in. **`middleware.ts`** protects app routes when those env vars are present. After each successful scan, the client calls **`POST /api/scans`** to persist the result (same JSON) for **`/scan/history`** and **`/scan/[id]`**.
- **Integrations path to continuous governance:** `/integrations` is the first native foundation. n8n is available now as a safe config-only integration (masked API key hint, no live pull yet). GitHub, Zapier, and Make are planned next as continuous source connectors.
- **Scheduled scans foundation:** `/schedules` stores **`scan_schedules`** + **`scan_schedule_runs`**. Today you can **Run now** to execute on the server (same engine as **`POST /api/scan`**) and persist results like the dashboard scan page. Automatic runs are not required yet: set **`TORQA_CRON_SECRET`** and later point a cron job at **`POST /api/scan-schedules/cron/tick`** (currently a no-op placeholder). Integration-scoped schedules can be created, but **Run now** returns a clear “not implemented” response until ingestion exists.
- **Team alerting (`/alerts`):** Apply migration `20260428200000_alert_destinations_and_rules.sql`. **`alert_destinations`** store Slack/Discord webhook URLs (https only), an email placeholder address, or **`in_app`** (workspace-wide fanout via `notify_workspace_members`). **`alert_rules`** bind triggers (`scan_failed`, `scan_needs_review`, `high_severity_finding`, `schedule_failed`) to destination UUIDs. Dispatch runs after legacy **`notification_preferences`** delivery from **`POST /api/scan`** (scoped with the active workspace cookie), **`POST /api/public/scan`** (personal rules for the API key owner), and successful/failed **schedule runs**. Webhook URLs are stripped from **GET** JSON — treat stored secrets as sensitive; rotate by **PATCH** with a new URL.
- **Share links (optional, Supabase-backed):** Apply migration `20260426150000_scan_history_share_id.sql` (column `share_id` + `get_scan_by_share_id` RPC). Owners can **`POST /api/scans/[scanId]/share`** to mint a token and copy **`/share/[shareId]`**. Public access does **not** open `scan_history` to anonymous table reads — only the **SECURITY DEFINER** RPC returns one row for a valid token. **`/share/*`** is excluded from auth middleware so links work without login.
- **Local / CI without Supabase:** Leave the env vars unset — the dashboard stays reachable without a login gate; scan still works; history UI explains that Supabase is not configured.
- **Samples:** Static workflows ship under `public/scan-samples/` for Vercel deploys (middleware allows `/scan-samples/*` without a session).

## Next steps (integration)

- Replace `src/data/queries.ts` with Supabase client calls (see repo `docs/cloud-backend.md`).
- Add auth (Supabase Auth or NextAuth) and gate `(app)` layout.
- Point “Run” JSON panel at `reports.payload` or Storage signed URLs.
