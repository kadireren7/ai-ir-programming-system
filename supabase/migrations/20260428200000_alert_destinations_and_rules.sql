-- Team alert destinations + rules (Slack/Discord/email placeholders, in-app fanout).

create table public.alert_destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  type text not null check (type in ('in_app', 'slack', 'discord', 'email')),
  name text not null check (char_length(name) between 1 and 120),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.alert_destinations is 'Outbound alert channels; webhook URLs live in config (masked in API responses).';
comment on column public.alert_destinations.organization_id is 'NULL = personal destination; set = workspace-managed destination.';

create index alert_destinations_user_created_idx
  on public.alert_destinations (user_id, created_at desc);

create index alert_destinations_org_created_idx
  on public.alert_destinations (organization_id, created_at desc)
  where organization_id is not null;

alter table public.alert_destinations enable row level security;

create policy alert_destinations_select on public.alert_destinations
  for select using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.is_org_member(organization_id))
  );

create policy alert_destinations_insert on public.alert_destinations
  for insert with check (
    user_id = auth.uid()
    and (
      organization_id is null
      or (organization_id is not null and public.can_admin_org(organization_id))
    )
  );

create policy alert_destinations_update on public.alert_destinations
  for update using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  )
  with check (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

create policy alert_destinations_delete on public.alert_destinations
  for delete using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

grant select, insert, update, delete on public.alert_destinations to authenticated;
grant all on public.alert_destinations to service_role;

create trigger alert_destinations_updated_at
  before update on public.alert_destinations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Alert rules
-- ---------------------------------------------------------------------------

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  enabled boolean not null default true,
  rule_trigger text not null check (
    rule_trigger in ('scan_failed', 'scan_needs_review', 'high_severity_finding', 'schedule_failed')
  ),
  destination_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.alert_rules is 'Maps governance triggers to alert_destinations (workspace or personal scope).';

create index alert_rules_user_created_idx
  on public.alert_rules (user_id, created_at desc);

create index alert_rules_org_created_idx
  on public.alert_rules (organization_id, created_at desc)
  where organization_id is not null;

alter table public.alert_rules enable row level security;

create policy alert_rules_select on public.alert_rules
  for select using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.is_org_member(organization_id))
  );

create policy alert_rules_insert on public.alert_rules
  for insert with check (
    user_id = auth.uid()
    and (
      organization_id is null
      or (organization_id is not null and public.can_admin_org(organization_id))
    )
  );

create policy alert_rules_update on public.alert_rules
  for update using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  )
  with check (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

create policy alert_rules_delete on public.alert_rules
  for delete using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

grant select, insert, update, delete on public.alert_rules to authenticated;
grant all on public.alert_rules to service_role;

create trigger alert_rules_updated_at
  before update on public.alert_rules
  for each row execute function public.set_updated_at();
