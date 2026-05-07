-- v0.3.0 Block 4 (Enterprise Identity) + Block 6 (Compliance & Reporting)
-- Adds: SSO configuration table, report schedules table

-- ─── SSO Configs ───────────────────────────────────────────────────────────
create table if not exists public.sso_configs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_type   text not null check (provider_type in ('google_workspace', 'entra_id', 'oidc')),
  client_id       text not null,
  client_secret   text not null,
  issuer_url      text not null,
  domain_restriction text,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  unique (organization_id)
);

alter table public.sso_configs enable row level security;

create policy "org_members_read_sso"
  on public.sso_configs for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = sso_configs.organization_id
        and user_id = auth.uid()
    )
  );

create policy "org_admins_manage_sso"
  on public.sso_configs for all
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = sso_configs.organization_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ─── Report Schedules ──────────────────────────────────────────────────────
create table if not exists public.report_schedules (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  name            text not null,
  report_type     text not null default 'compliance' check (report_type in ('compliance', 'audit', 'scan_summary')),
  frequency       text not null default 'weekly' check (frequency in ('daily', 'weekly', 'monthly')),
  delivery_email  text not null,
  framework       text check (framework in ('soc2', 'iso27001', 'both')),
  enabled         boolean not null default true,
  last_sent_at    timestamptz,
  next_send_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.report_schedules enable row level security;

create policy "users_own_report_schedules"
  on public.report_schedules for all
  using (user_id = auth.uid());

-- ─── Compliance report cache (optional) ───────────────────────────────────
-- Stores point-in-time compliance snapshots for history
create table if not exists public.compliance_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  framework       text not null,
  snapshot        jsonb not null default '{}',
  generated_at    timestamptz not null default now()
);

alter table public.compliance_snapshots enable row level security;

create policy "users_own_compliance_snapshots"
  on public.compliance_snapshots for all
  using (user_id = auth.uid());
