-- M2: provider_tokens table for encrypted OAuth/API tokens
-- + auth_type and token_id columns on integrations

create table public.provider_tokens (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  provider     text        not null,
  token_type   text        not null default 'access_token'
                           check (token_type in ('access_token', 'refresh_token', 'api_key')),
  token_hint   text        not null,
  encrypted_token text     not null,
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.provider_tokens is
  'Encrypted OAuth and API-key tokens. Only the server decrypts; clients see token_hint only.';

create index provider_tokens_user_provider_idx
  on public.provider_tokens (user_id, provider);

alter table public.provider_tokens enable row level security;

create policy provider_tokens_select on public.provider_tokens
  for select using (user_id = auth.uid());

create policy provider_tokens_insert on public.provider_tokens
  for insert with check (user_id = auth.uid());

create policy provider_tokens_update on public.provider_tokens
  for update using (user_id = auth.uid());

create policy provider_tokens_delete on public.provider_tokens
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.provider_tokens to authenticated;
grant all on public.provider_tokens to service_role;

create trigger provider_tokens_updated_at
  before update on public.provider_tokens
  for each row execute function public.set_updated_at();

-- Add auth_type and token_id to integrations
alter table public.integrations
  add column auth_type text check (auth_type in ('apikey', 'oauth', 'webhook', 'none')),
  add column token_id  uuid references public.provider_tokens (id) on delete set null;

-- Expand provider allowlist to cover all connectors
alter table public.integrations
  drop constraint integrations_provider_check;

alter table public.integrations
  add constraint integrations_provider_check
  check (provider in ('n8n', 'github', 'zapier', 'make', 'pipedream', 'webhook', 'ai-agent'));
