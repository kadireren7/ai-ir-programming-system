-- M6: alert_deliveries — delivery log for every outbound alert attempt.

create table public.alert_deliveries (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  rule_id          uuid        references public.alert_rules (id) on delete set null,
  destination_id   uuid        references public.alert_destinations (id) on delete set null,
  destination_type text        not null,
  rule_trigger     text,
  status           text        not null check (status in ('ok', 'error', 'test')),
  error_message    text,
  workflow_name    text,
  scan_decision    text,
  risk_score       integer,
  created_at       timestamptz not null default now()
);

comment on table public.alert_deliveries is
  'One row per outbound alert attempt (Slack / Discord / email / in-app). Status=test for test pings.';

create index alert_deliveries_user_created_idx
  on public.alert_deliveries (user_id, created_at desc);

alter table public.alert_deliveries enable row level security;

create policy alert_deliveries_select on public.alert_deliveries
  for select using (user_id = auth.uid());

grant select on public.alert_deliveries to authenticated;
grant all    on public.alert_deliveries to service_role;
