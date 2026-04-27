-- Integrations foundation: provider connections scoped to user or workspace.

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('n8n', 'github', 'zapier', 'make')),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'connected', 'error', 'paused')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.integrations is 'Workflow source integrations (foundation for continuous scan governance).';
comment on column public.integrations.organization_id is 'NULL = personal integration; set = workspace shared integration.';

create index integrations_user_created_idx
  on public.integrations (user_id, created_at desc);

create index integrations_org_created_idx
  on public.integrations (organization_id, created_at desc)
  where organization_id is not null;

alter table public.integrations enable row level security;

create policy integrations_select on public.integrations
  for select using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.is_org_member(organization_id))
  );

create policy integrations_insert on public.integrations
  for insert with check (
    user_id = auth.uid()
    and (
      organization_id is null
      or (organization_id is not null and public.is_org_member(organization_id))
    )
  );

create policy integrations_update on public.integrations
  for update using (
    user_id = auth.uid()
    or (organization_id is not null and public.can_admin_org(organization_id))
  )
  with check (
    user_id = auth.uid()
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

create policy integrations_delete on public.integrations
  for delete using (
    user_id = auth.uid()
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

grant select, insert, update, delete on public.integrations to authenticated;
grant all on public.integrations to service_role;

create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();
