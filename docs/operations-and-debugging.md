# Operations, debugging, and deployment checks

This guide is for running the Torqa **dashboard** (`dashboard/`) in production or staging without external APM vendors.

## Health endpoint

`GET /api/health` returns JSON (always HTTP 200) with:

- `status`: `"ok"` or `"degraded"` (readiness-style hint; core scan provider must resolve).
- `version`: npm package version from `dashboard/package.json`.
- `environment`: `NODE_ENV` when known.
- `checks`: booleans only — no secret values (Supabase public env, scan provider id, whether the hosted engine URL is set, cron secret presence, API key pepper, public-scan auth prerequisites).
- `scanProviderIdsSupported`: allowed `TORQA_SCAN_PROVIDER` values for typo checks.

Use it for load balancer liveness and for quick post-deploy verification (`curl -sS https://<host>/api/health | jq`).

## Correlating errors

API JSON errors use a stable shape:

```json
{ "error": "Human-readable message", "code": "machine_code", "requestId": "…" }
```

The same `requestId` is returned in the `x-request-id` response header. When reporting an issue, include **requestId** (and approximate time); operators can grep application logs for that id.

Routes that fully adopt this helper today include: `POST /api/scan`, `POST /api/public/scan`, `GET/PATCH` notification settings, alert destinations/rules lists and mutations (selected paths), workspace policies lists and creates, scan schedule list/create, cron tick auth failures, and database error fallbacks on several resources.

## Structured logs

Server code may emit one-line JSON logs via `logStructured` in `dashboard/src/lib/structured-log.ts`. Known sensitive key names are redacted to `[REDACTED]`; values are shallowly truncated for oversized strings.

Default destination is **stdout** (container logs). No third-party log shipping is configured in the app.

## Deployment checklist

1. **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for cloud mode; `SUPABASE_SERVICE_ROLE_KEY` only on the server for public API key auth; `TORQA_SCAN_PROVIDER`; optional `TORQA_ENGINE_URL`, `TORQA_API_KEY_PEPPER`, `TORQA_CRON_SECRET`.
2. **Health:** After deploy, call `GET /api/health` and confirm `checks.scanProviderResolvable` is true.
3. **Auth:** Confirm `POST /api/scan` with Supabase configured returns 401 without a session (expected).
4. **Public scan:** If using API keys, confirm `POST /api/public/scan` with a valid key returns 200 and sets `x-request-id`.

## Local debugging

- Run `npm run dev` in `dashboard/` and watch the terminal for `logStructured` JSON lines.
- Reproduce failing calls with `curl -v` and note `x-request-id` from the response.
- See `docs/security.md` for secret handling and RLS expectations.
