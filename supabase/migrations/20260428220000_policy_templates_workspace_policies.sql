-- Governance policy templates (read-only catalog) + workspace/personal policy rows.

create table public.policy_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null,
  built_in boolean not null default true,
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.policy_templates is 'Catalog of governance thresholds; built-in rows ship with the product.';

alter table public.policy_templates enable row level security;

create policy policy_templates_select on public.policy_templates
  for select to authenticated using (true);

grant select on public.policy_templates to authenticated;
grant all on public.policy_templates to service_role;

create trigger policy_templates_updated_at
  before update on public.policy_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Workspace / personal saved policies (threshold overrides)
-- ---------------------------------------------------------------------------

create table public.workspace_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  template_slug text references public.policy_templates (slug) on delete set null,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workspace_policies is 'User or workspace-scoped governance policy; merges template defaults with config overrides.';
comment on column public.workspace_policies.template_slug is 'Optional link to policy_templates.slug for baseline defaults.';

create index workspace_policies_user_created_idx
  on public.workspace_policies (user_id, created_at desc);

create index workspace_policies_org_created_idx
  on public.workspace_policies (organization_id, created_at desc)
  where organization_id is not null;

alter table public.workspace_policies enable row level security;

create policy workspace_policies_select on public.workspace_policies
  for select using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.is_org_member(organization_id))
  );

create policy workspace_policies_insert on public.workspace_policies
  for insert with check (
    user_id = auth.uid()
    and (
      organization_id is null
      or (organization_id is not null and public.can_admin_org(organization_id))
    )
  );

create policy workspace_policies_update on public.workspace_policies
  for update using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  )
  with check (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

create policy workspace_policies_delete on public.workspace_policies
  for delete using (
    (organization_id is null and user_id = auth.uid())
    or (organization_id is not null and public.can_admin_org(organization_id))
  );

grant select, insert, update, delete on public.workspace_policies to authenticated;
grant all on public.workspace_policies to service_role;

create trigger workspace_policies_updated_at
  before update on public.workspace_policies
  for each row execute function public.set_updated_at();

-- Optional policy on schedules
alter table public.scan_schedules
  add column if not exists workspace_policy_id uuid references public.workspace_policies (id) on delete set null;

comment on column public.scan_schedules.workspace_policy_id is 'When set, manual/future scheduled runs evaluate scan output against this workspace policy.';

-- ---------------------------------------------------------------------------
-- Seed built-in templates (must match dashboard/src/lib/built-in-policy-templates.ts)
-- ---------------------------------------------------------------------------

insert into public.policy_templates (slug, name, description, category, built_in, config)
values
  (
    'startup-baseline',
    'Startup baseline',
    'Pragmatic defaults for small teams shipping quickly.',
    'baseline',
    true,
    '{"minimumTrustScore":55,"failOnCritical":true,"maxReviewFindings":12,"reviewOverflowMode":"warn","requireNoPlaintextSecrets":true,"requireWebhookAuth":false,"requireErrorHandling":false,"blockTlsBypass":true}'::jsonb
  ),
  (
    'strict-security',
    'Strict security',
    'Tighten gates for production systems handling sensitive data.',
    'security',
    true,
    '{"minimumTrustScore":72,"failOnCritical":true,"maxReviewFindings":4,"reviewOverflowMode":"fail","requireNoPlaintextSecrets":true,"requireWebhookAuth":true,"requireErrorHandling":true,"blockTlsBypass":true}'::jsonb
  ),
  (
    'agency-client-safe',
    'Agency client-safe',
    'Client delivery posture: visible controls and fewer review surprises.',
    'delivery',
    true,
    '{"minimumTrustScore":62,"failOnCritical":true,"maxReviewFindings":8,"reviewOverflowMode":"warn","requireNoPlaintextSecrets":true,"requireWebhookAuth":true,"requireErrorHandling":true,"blockTlsBypass":true}'::jsonb
  ),
  (
    'enterprise-governance',
    'Enterprise governance',
    'Board-ready bar: high trust floor and strict hygiene.',
    'enterprise',
    true,
    '{"minimumTrustScore":80,"failOnCritical":true,"maxReviewFindings":2,"reviewOverflowMode":"fail","requireNoPlaintextSecrets":true,"requireWebhookAuth":true,"requireErrorHandling":true,"blockTlsBypass":true}'::jsonb
  ),
  (
    'n8n-production',
    'n8n production workflow',
    'Optimized for n8n exports: webhooks, HTTP, and TLS expectations.',
    'n8n',
    true,
    '{"minimumTrustScore":68,"failOnCritical":true,"maxReviewFindings":6,"reviewOverflowMode":"fail","requireNoPlaintextSecrets":true,"requireWebhookAuth":true,"requireErrorHandling":true,"blockTlsBypass":true}'::jsonb
  )
on conflict (slug) do nothing;
