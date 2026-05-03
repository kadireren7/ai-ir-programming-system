-- M5: Policy Enforcement Webhooks
-- Outbound webhooks triggered when a scan produces a BLOCK decision.

create table public.enforcement_webhooks (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  organization_id uuid       references public.organizations (id) on delete cascade,
  name           text        not null check (char_length(name) between 1 and 120),
  url            text        not null check (char_length(url) between 10 and 2048),
  secret         text,
  enabled        boolean     not null default true,
  trigger_on     text[]      not null default '{"FAIL"}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.enforcement_webhooks is 'Outbound webhooks fired on governance decisions (BLOCK/FAIL).';
comment on column public.enforcement_webhooks.trigger_on is 'Array of ScanDecision values that trigger this webhook: FAIL, NEEDS REVIEW.';
comment on column public.enforcement_webhooks.secret is 'Optional HMAC-SHA256 signing secret. Stored encrypted at application layer.';

create index enforcement_webhooks_user_idx on public.enforcement_webhooks (user_id);
create index enforcement_webhooks_org_idx  on public.enforcement_webhooks (organization_id) where organization_id is not null;

alter table public.enforcement_webhooks enable row level security;

create policy enforcement_webhooks_select on public.enforcement_webhooks
  for select using (user_id = auth.uid() or (organization_id is not null and exists (
    select 1 from public.organization_members m
    where m.organization_id = enforcement_webhooks.organization_id and m.user_id = auth.uid()
  )));

create policy enforcement_webhooks_insert on public.enforcement_webhooks
  for insert with check (user_id = auth.uid());

create policy enforcement_webhooks_update on public.enforcement_webhooks
  for update using (user_id = auth.uid());

create policy enforcement_webhooks_delete on public.enforcement_webhooks
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.enforcement_webhooks to authenticated;
grant all on public.enforcement_webhooks to service_role;

-- Delivery log for enforcement webhooks
create table public.enforcement_webhook_deliveries (
  id             uuid        primary key default gen_random_uuid(),
  webhook_id     uuid        not null references public.enforcement_webhooks (id) on delete cascade,
  scan_id        uuid,
  decision       text        not null,
  status_code    integer,
  success        boolean     not null default false,
  error_message  text,
  created_at     timestamptz not null default now()
);

alter table public.enforcement_webhook_deliveries enable row level security;

create policy enforcement_deliveries_select on public.enforcement_webhook_deliveries
  for select using (exists (
    select 1 from public.enforcement_webhooks w
    where w.id = enforcement_webhook_deliveries.webhook_id and w.user_id = auth.uid()
  ));

grant select, insert on public.enforcement_webhook_deliveries to authenticated;
grant all on public.enforcement_webhook_deliveries to service_role;
