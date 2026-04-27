# Torqa Supabase backend

SQL migrations define the **first Torqa cloud** data model: profiles, organizations, projects, policies, validation runs, reports, **per-user dashboard scan history** (`scan_history`), and **saved workflow templates** (`workflow_templates` for the dashboard workflow library), with **row level security** aligned to org membership (and self-only access for `scan_history` and `workflow_templates`).

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (cloud) or local stack

## Apply migrations

From the repository root:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or run the SQL file in the Supabase SQL editor (Dashboard → SQL).

## New project bootstrap

1. Enable **Supabase Auth** (email, SSO, etc.).
2. Apply migrations so `handle_new_user` creates a `profiles` row for each `auth.users` row.
3. Create an organization via RPC (recommended) or REST:

```sql
select public.create_organization('My team', 'my-team');
```

4. Create a **project** and **policies** with the authenticated client (PostgREST) or dashboard.
5. **Team workspaces:** apply `20260426210000_workspace_shared_scans_invites.sql` so dashboard scans and workflow templates can attach to `organizations.id` (`organization_id` columns + invites). Use **`/workspace`** in the app to create an org and set the active-workspace cookie.
6. **Scan notifications:** apply `20260426220000_scan_notifications.sql` for `notification_preferences` + `in_app_notifications` (alerts after **`POST /api/scan`** when signed in).
7. **Public API keys:** apply `20260426223000_api_keys.sql` for hashed key storage (`api_keys`) and audit logs (`api_key_usage_logs`) used by **`POST /api/public/scan`**.
8. **Workspace collaboration v2:** apply `20260427200000_workspace_collaboration_v2.sql` for `workspace_activity_logs`, role/ownership/settings RPCs, and workspace-wide in-app notification fanout helpers.
9. **Integrations foundation:** apply `20260427213000_integrations_foundation.sql` for `integrations` table + RLS (personal and workspace-scoped integration records).
10. **Scan schedules:** apply `20260427234000_scan_schedules_foundation.sql` for `scan_schedules` + `scan_schedule_runs` (manual run today; future cron).
11. **Team alerts:** apply `20260428200000_alert_destinations_and_rules.sql` for `alert_destinations` + `alert_rules` (Slack/Discord/email placeholder/in-app; RLS mirrors integrations-style personal vs workspace admin).

Design details, RLS model, and API layout: **[Cloud backend](../docs/cloud-backend.md)**.
