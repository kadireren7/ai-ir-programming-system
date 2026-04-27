-- Background scheduled scans: scheduler-ready rows + run audit trail.
-- Execution is manual or future cron; no pg_cron dependency.

create table public.scan_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  scope_type text not null check (scope_type in ('workflow_template', 'integration')),
  scope_id uuid not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'manual')),
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.scan_schedules is 'Recurring or manual scan schedules; scope_id targets workflow_templates or integrations.';
comment on column public.scan_schedules.organization_id is 'NULL = personal schedule; set = workspace schedule (admin-managed).';
comment on column public.scan_schedules.scope_id is 'UUID of workflow_templates.id or integrations.id depending on scope_type.';

create index scan_schedules_user_created_idx
  on public.scan_schedules (user_id, created_at desc);

create index scan_schedules_org_created_idx
  on public.scan_schedules (organization_id, created_at desc)
  where organization_id is not null;

create index scan_schedules_next_run_idx
  on public.scan_schedules (next_run_at)
  where enabled = true and next_run_at is not null;

alter table public.scan_schedules enable row level security;

-- Personal: owner full access. Workspace: members read, admins manage.
create policy scan_schedules_select on public.scan_schedules
  for select using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.is_org_member(organization_id))
  );

create policy scan_schedules_insert on public.scan_schedules
  for insert with check (
    user_id = auth.uid()
    and (
      organization_id is null
      or (organization_id is not null and public.can_admin_org(organization_id))
    )
  );

create policy scan_schedules_update on public.scan_schedules
  for update using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  )
  with check (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

create policy scan_schedules_delete on public.scan_schedules
  for delete using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

grant select, insert, update, delete on public.scan_schedules to authenticated;
grant all on public.scan_schedules to service_role;

create trigger scan_schedules_updated_at
  before update on public.scan_schedules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Run history
-- ---------------------------------------------------------------------------

create table public.scan_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.scan_schedules (id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  result jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.scan_schedule_runs is 'Per-execution audit row for a scan_schedule (manual, future cron, etc.).';

create index scan_schedule_runs_schedule_created_idx
  on public.scan_schedule_runs (schedule_id, created_at desc);

alter table public.scan_schedule_runs enable row level security;

create policy scan_schedule_runs_select on public.scan_schedule_runs
  for select using (
    exists (
      select 1
      from public.scan_schedules s
      where s.id = schedule_id
        and (
          (s.organization_id is null and s.user_id = auth.uid())
          or (s.organization_id is not null and public.is_org_member(s.organization_id))
        )
    )
  );

create policy scan_schedule_runs_insert on public.scan_schedule_runs
  for insert with check (
    exists (
      select 1
      from public.scan_schedules s
      where s.id = schedule_id
        and (
          (s.organization_id is null and s.user_id = auth.uid())
          or (s.organization_id is not null and public.is_org_member(s.organization_id))
        )
    )
  );

create policy scan_schedule_runs_update on public.scan_schedule_runs
  for update using (
    exists (
      select 1
      from public.scan_schedules s
      where s.id = schedule_id
        and (
          (s.organization_id is null and s.user_id = auth.uid())
          or (s.organization_id is not null and public.is_org_member(s.organization_id))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.scan_schedules s
      where s.id = schedule_id
        and (
          (s.organization_id is null and s.user_id = auth.uid())
          or (s.organization_id is not null and public.is_org_member(s.organization_id))
        )
    )
  );

grant select, insert, update on public.scan_schedule_runs to authenticated;
grant all on public.scan_schedule_runs to service_role;
