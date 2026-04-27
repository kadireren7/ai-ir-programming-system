# Torqa security notes (MVP)

This document summarizes how the dashboard API is hardened for production-style exposure, what is still your responsibility, and a short go-live checklist.

## Authentication and public surfaces

- **`POST /api/scan`:** When Supabase is configured (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`), the route requires a logged-in user (session cookie). With no Supabase env, the route stays open for local/demo use.
- **`POST /api/public/scan`:** Uses hashed API keys via the **service role** server client only on the server. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client or under `NEXT_PUBLIC_*`.
- **Middleware** does not gate `/api/*`; each route performs its own auth. Treat new API routes as untrusted by default.

## Row Level Security (RLS)

- Authenticated routes use the **anon key** + user session. Correctness depends on Supabase RLS policies for tables such as `api_keys`, `alert_destinations`, `alert_rules`, `workspace_policies`, `scan_schedules`, and `notification_preferences`.
- **`createAdminClient()`** bypasses RLS and is restricted to trusted server code (e.g. public API key lookup). Audit any new use of the service role.

## Webhooks and SSRF

- Slack and Discord outbound URLs are validated: **HTTPS**, no userinfo, host/path allowlists (`hooks.slack.com/services/...`, `discord.com` / `discordapp.com` `/api/webhooks/...`). Validation runs at **write time** (settings) and again at **dispatch** (defense in depth).
- This does not remove the need for egress controls and logging in production.

## Secrets in responses and logs

- Alert destination **GET** responses mask `webhookUrl` / email (see `maskDestinationConfig` in `dashboard/src/lib/alerts.ts`).
- Notification preferences **GET** / **PATCH** responses do not return raw Slack webhook URLs; use `slackWebhookConfigured` and re-enter a URL to rotate.
- Avoid logging raw webhook URLs, API keys, or `Authorization` headers.

## Input limits

- Scan JSON bodies (`/api/scan`, `/api/public/scan`) are capped (see `SCAN_JSON_BODY_MAX_BYTES` in `dashboard/src/lib/request-body.ts`).
- Workspace policy `config` JSON must stay under a byte budget (`MAX_POLICY_CONFIG_JSON_BYTES` in `dashboard/src/lib/policy-input-limits.ts`).
- Alert rules accept at most **32** destination UUIDs per rule.

## Errors

- Many routes return a generic **database** error (`code: "database_error"`) instead of forwarding raw PostgREST messages, to reduce information leakage.

## Cron / internal hooks

- **`POST /api/scan-schedules/cron/tick`** expects `Authorization: Bearer <TORQA_CRON_SECRET>`. Compare secrets in a timing-safe way; rotate `TORQA_CRON_SECRET` if it may have leaked.

## Production checklist

1. Set strong, unique values for `TORQA_API_KEY_PEPPER`, `TORQA_CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`; store them only in server-side secrets (never `NEXT_PUBLIC_*`).
2. Confirm Supabase RLS for all tables touched by `dashboard/src/app/api/**`.
3. Replace the public scan **rate limit placeholder** with Redis / KV / edge limits and log abuse signals.
4. Enable WAF / CDN limits on body size and request rates for `/api/public/*`.
5. Review outbound `fetch` call sites (webhooks, future n8n calls) for SSRF and use private network egress controls where applicable.
6. Turn on structured logging without secret fields; monitor 401/429 on `/api/public/scan`.

See also **`docs/operations-and-debugging.md`** for health checks, `requestId` correlation, and structured logging.

## Known residual risks (non-exhaustive)

- DNS rebinding / redirect-based SSRF is not fully solved by URL parsing alone; host allowlists and network policy still matter.
- `/api/scan` without Supabase remains unauthenticated by design for local demos.
- Placeholder email/Slack delivery paths are no-ops or best-effort; wire real providers with their own security reviews.
