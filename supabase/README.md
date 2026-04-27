# Torqa Supabase backend

SQL migrations define the **first Torqa cloud** data model: profiles, organizations, projects, policies, validation runs, reports, **per-user dashboard scan history** (`scan_history`), and **saved workflow templates** (`workflow_templates` for the dashboard workflow library), with **row level security** aligned to org membership (and self-only access for `scan_history` and `workflow_templates`).

**First-user launch:** apply all migrations in order, then follow [docs/launch-checklist.md](../docs/launch-checklist.md) and [dashboard/README.md](../dashboard/README.md) for env vars and smoke tests.

## Migration ordering

Files live in `supabase/migrations/` with **UTC timestamp prefixes**. Apply them **in ascending filename order** on a fresh database (`supabase db push` does this). Do not cherry-pick mid-chain on production unless you know dependencies (later files may assume tables and RPCs from earlier ones).

Bootstrap checklist (high level — see filenames in the folder for the exact chain):

1. Core Torqa cloud + profiles (`20260426120000_*`)
2. Dashboard scan history + share column evolution (`20260426140000_*`, `20260426150000_*`)
3. Workflow templates (`20260426200000_*`)
4. Workspace shared scans + invites (`20260426210000_*`)
5. Scan notifications (`20260426220000_*`)
6. API keys (`20260426223000_*`)
7. Workspace collaboration v2 (`20260427200000_*`)
8. Integrations (`20260427213000_*`)
9. Scan schedules (`20260427234000_*`)
10. Alert destinations + rules (`20260428200000_*`)
11. Policy templates + workspace policies (`20260428220000_*`)
12. Security advisor hardening + share RPC + invite notify (`20260429120000_*` through `20260429150000_*`)

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
2. Apply **all** migrations (see **Migration ordering** above) so `handle_new_user` and downstream tables exist.
3. Create an organization via RPC (recommended) or SQL:

```sql
select public.create_organization('My team', 'my-team');
```

4. Open the **dashboard** at `/workspace` to manage the active workspace cookie, invites, and team-scoped scans.
5. Optional: create **projects** and legacy policies via PostgREST or older dashboard flows — primary MVP paths are **scan**, **workflow library**, **policies** (templates), and **insights**.

Design details, RLS model, and API layout: **[Cloud backend](../docs/cloud-backend.md)**.
