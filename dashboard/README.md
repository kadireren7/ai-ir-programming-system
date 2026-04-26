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
| `/login` | Login (mock auth) |
| `/` | Dashboard overview (stats, risk chart, recent runs) |
| `/projects` | Projects grid |
| `/scan` | **Workflow scan** — upload/paste JSON, pick generic vs n8n, run **`POST /api/scan`**; saves history when Supabase auth is configured |
| `/scan/history` | **Saved scans** — table of past reports (RLS: your rows only) |
| `/scan/[id]` | **Re-open a report** — read-only view of a saved `scan_history` row |
| `/login` | **Email sign-in / sign-up** (Supabase Auth); optional when env vars are unset (local/CI) |
| `/auth/callback` | **OAuth / email-confirm** exchange route for Supabase |
| `/api/scan` | **POST** — body `{ "source": "n8n" \| "generic", "content": { … } }` → JSON result (`engine: server-preview`) |
| `/api/scans` | **POST** (authenticated) — persist a scan result to `scan_history` |
| `/validation` | Validation history table |
| `/validation/[runId]` | Run detail + mock JSON |
| `/policy` | Policy settings |
| `/team` | Team members |

## Production build

```bash
npm run build
npm start
```

### `/scan` — server pipeline vs Torqa CLI

- **Today:** The page calls **`POST /api/scan`**. The route runs deterministic heuristics in **`src/lib/scan-engine.ts`** (Node runtime): same rules as before (n8n-shaped exports: HTTP Request, Code, credentials, error-handling hints, webhook/slack/email side effects). Response includes `status`, `riskScore`, `findings`, `totals`, and `engine: "server-preview"`. This is **not** the Torqa Python package or CLI.
- **Auth & history:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, apply migrations (including `scan_history`), then use **`/login`** to sign up or sign in. **`middleware.ts`** protects app routes when those env vars are present. After each successful scan, the client calls **`POST /api/scans`** to persist the result (same JSON) for **`/scan/history`** and **`/scan/[id]`**.
- **Local / CI without Supabase:** Leave the env vars unset — the dashboard stays reachable without a login gate; scan still works; history UI explains that Supabase is not configured.
- **Future:** optionally proxy the same request shape to a **Torqa backend** (shell `torqa scan` or shared library) so results match production tooling. Static sample workflows ship under `public/scan-samples/` for Vercel deploys (middleware allows `/scan-samples/*` without a session).

## Next steps (integration)

- Replace `src/data/queries.ts` with Supabase client calls (see repo `docs/cloud-backend.md`).
- Add auth (Supabase Auth or NextAuth) and gate `(app)` layout.
- Point “Run” JSON panel at `reports.payload` or Storage signed URLs.
