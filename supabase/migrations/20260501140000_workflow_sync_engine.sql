-- M4: Workflow Sync Engine
-- Extend workflow_templates with sync metadata + add sync_logs table.

-- Extend source allowlist
alter table public.workflow_templates drop constraint workflow_templates_source_check;
alter table public.workflow_templates
  add constraint workflow_templates_source_check
  check (source in ('n8n', 'github', 'generic', 'webhook', 'pipedream'));

-- Also extend scan_history source allowlist
alter table public.scan_history drop constraint scan_history_source_check;
alter table public.scan_history
  add constraint scan_history_source_check
  check (source in ('n8n', 'github', 'generic', 'webhook', 'pipedream'));

-- Add sync metadata columns to workflow_templates
alter table public.workflow_templates
  add column source_id        uuid        references public.integrations (id) on delete set null,
  add column external_id      text,
  add column last_synced_at   timestamptz,
  add column risk_score       integer     check (risk_score between 0 and 100),
  add column last_scan_decision text      check (last_scan_decision in ('approve', 'review', 'block')),
  add column last_scanned_at  timestamptz;

comment on column public.workflow_templates.source_id    is 'Integration that sourced this workflow; NULL = manually uploaded.';
comment on column public.workflow_templates.external_id  is 'Workflow ID in the source system (e.g. n8n workflow UUID).';
comment on column public.workflow_templates.risk_score   is 'Latest trust_score (0-100) from governance scan; NULL = not yet scanned.';

-- Unique index: one row per (user, source_id, external_id) to support upsert on sync
create unique index workflow_templates_upsert_idx
  on public.workflow_templates (user_id, source_id, external_id)
  where source_id is not null and external_id is not null;

-- Sync log table
create table public.sync_logs (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  integration_id uuid        not null references public.integrations (id) on delete cascade,
  status         text        not null check (status in ('success', 'error', 'partial')),
  added          integer     not null default 0,
  updated        integer     not null default 0,
  unchanged      integer     not null default 0,
  error_message  text,
  created_at     timestamptz not null default now()
);

comment on table public.sync_logs is 'Record of each workflow sync run per integration.';

create index sync_logs_integration_created_idx
  on public.sync_logs (integration_id, created_at desc);

alter table public.sync_logs enable row level security;

create policy sync_logs_select on public.sync_logs
  for select using (user_id = auth.uid());

create policy sync_logs_insert on public.sync_logs
  for insert with check (user_id = auth.uid());

grant select, insert on public.sync_logs to authenticated;
grant all on public.sync_logs to service_role;
