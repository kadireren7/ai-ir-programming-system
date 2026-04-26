# Torqa Supabase backend

SQL migrations define the **first Torqa cloud** data model: profiles, organizations, projects, policies, validation runs, reports, and **per-user dashboard scan history** (`scan_history`), with **row level security** aligned to org membership (and self-only access for `scan_history`).

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

Design details, RLS model, and API layout: **[Cloud backend](../docs/cloud-backend.md)**.
