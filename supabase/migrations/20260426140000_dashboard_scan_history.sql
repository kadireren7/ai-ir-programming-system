-- Dashboard: persisted workflow scans per user (Supabase Auth).
-- Separate from validation_runs (org/project scoped).

create table public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('n8n', 'generic')),
  workflow_name text,
  result jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.scan_history is 'User-scoped /scan results from dashboard server-preview engine.';

create index scan_history_user_created_idx on public.scan_history (user_id, created_at desc);

alter table public.scan_history enable row level security;

create policy scan_history_select_own on public.scan_history
  for select using (user_id = auth.uid());

create policy scan_history_insert_own on public.scan_history
  for insert with check (user_id = auth.uid());

create policy scan_history_delete_own on public.scan_history
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.scan_history to authenticated;
grant all on public.scan_history to service_role;
