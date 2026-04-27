-- Workspace collaboration v2: activity feed, member management, ownership transfer,
-- workspace settings actions, and workspace-wide in-app notifications.

create table public.workspace_activity_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.workspace_activity_logs is 'Immutable workspace activity feed for collaboration and audit.';

create index workspace_activity_logs_org_created_idx
  on public.workspace_activity_logs (organization_id, created_at desc);

alter table public.workspace_activity_logs enable row level security;

create policy workspace_activity_logs_select_member on public.workspace_activity_logs
  for select using (public.is_org_member(organization_id));

create policy workspace_activity_logs_insert_admin on public.workspace_activity_logs
  for insert with check (public.can_admin_org(organization_id));

grant select, insert on public.workspace_activity_logs to authenticated;
grant all on public.workspace_activity_logs to service_role;

create or replace function public.can_owner_org(p_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.organization_role(p_organization_id) = 'owner';
$$;

grant execute on function public.can_owner_org(uuid) to authenticated;
grant execute on function public.can_owner_org(uuid) to service_role;

create or replace function public.log_workspace_activity(
  p_organization_id uuid,
  p_action text,
  p_target text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'log_workspace_activity requires an authenticated user';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'not a member of this workspace';
  end if;
  insert into public.workspace_activity_logs (organization_id, actor_user_id, action, target, metadata)
  values (p_organization_id, auth.uid(), p_action, p_target, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.log_workspace_activity(uuid, text, text, jsonb) from public;
grant execute on function public.log_workspace_activity(uuid, text, text, jsonb) to authenticated;
grant execute on function public.log_workspace_activity(uuid, text, text, jsonb) to service_role;

create or replace function public.notify_workspace_members(
  p_organization_id uuid,
  p_title text,
  p_body text,
  p_severity text default 'info',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'notify_workspace_members requires an authenticated user';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'not a member of this workspace';
  end if;
  insert into public.in_app_notifications (user_id, title, body, severity, metadata)
  select m.user_id, p_title, p_body, p_severity, coalesce(p_metadata, '{}'::jsonb)
  from public.organization_members m
  where m.organization_id = p_organization_id;
end;
$$;

revoke all on function public.notify_workspace_members(uuid, text, text, text, jsonb) from public;
grant execute on function public.notify_workspace_members(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.notify_workspace_members(uuid, text, text, text, jsonb) to service_role;

create or replace function public.workspace_update_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception 'workspace_update_member_role requires authenticated user';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'role must be admin or member';
  end if;
  v_actor_role := public.organization_role(p_organization_id);
  if v_actor_role not in ('owner', 'admin') then
    raise exception 'not allowed';
  end if;

  select role into v_target_role
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_user_id;

  if v_target_role is null then
    raise exception 'member not found';
  end if;
  if v_target_role = 'owner' then
    raise exception 'cannot edit owner role from this action';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' and v_actor_role = 'admin' then
    raise exception 'admin cannot demote themselves to member';
  end if;

  update public.organization_members
  set role = p_role
  where organization_id = p_organization_id
    and user_id = p_user_id;
end;
$$;

revoke all on function public.workspace_update_member_role(uuid, uuid, text) from public;
grant execute on function public.workspace_update_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.workspace_update_member_role(uuid, uuid, text) to service_role;

create or replace function public.workspace_remove_member(
  p_organization_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception 'workspace_remove_member requires authenticated user';
  end if;
  v_actor_role := public.organization_role(p_organization_id);
  if v_actor_role not in ('owner', 'admin') then
    raise exception 'not allowed';
  end if;

  select role into v_target_role
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_user_id;

  if v_target_role is null then
    raise exception 'member not found';
  end if;
  if v_target_role = 'owner' then
    raise exception 'cannot remove owner';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'use leave action to remove yourself';
  end if;

  delete from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_user_id;
end;
$$;

revoke all on function public.workspace_remove_member(uuid, uuid) from public;
grant execute on function public.workspace_remove_member(uuid, uuid) to authenticated;
grant execute on function public.workspace_remove_member(uuid, uuid) to service_role;

create or replace function public.workspace_transfer_ownership(
  p_organization_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_role text;
begin
  if auth.uid() is null then
    raise exception 'workspace_transfer_ownership requires authenticated user';
  end if;
  if not public.can_owner_org(p_organization_id) then
    raise exception 'only current owner can transfer ownership';
  end if;

  select role into v_new_role
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_new_owner_user_id;

  if v_new_role is null then
    raise exception 'new owner must already be a member';
  end if;

  update public.organization_members
  set role = 'admin'
  where organization_id = p_organization_id
    and user_id = auth.uid();

  update public.organization_members
  set role = 'owner'
  where organization_id = p_organization_id
    and user_id = p_new_owner_user_id;
end;
$$;

revoke all on function public.workspace_transfer_ownership(uuid, uuid) from public;
grant execute on function public.workspace_transfer_ownership(uuid, uuid) to authenticated;
grant execute on function public.workspace_transfer_ownership(uuid, uuid) to service_role;

create or replace function public.workspace_rename(
  p_organization_id uuid,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'workspace_rename requires authenticated user';
  end if;
  if not public.can_admin_org(p_organization_id) then
    raise exception 'not allowed';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'workspace name is required';
  end if;
  update public.organizations
  set name = trim(p_name)
  where id = p_organization_id;
end;
$$;

revoke all on function public.workspace_rename(uuid, text) from public;
grant execute on function public.workspace_rename(uuid, text) to authenticated;
grant execute on function public.workspace_rename(uuid, text) to service_role;

create or replace function public.workspace_leave(
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'workspace_leave requires authenticated user';
  end if;
  select role into v_role
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = auth.uid();
  if v_role is null then
    raise exception 'not a member';
  end if;
  if v_role = 'owner' then
    raise exception 'owner cannot leave workspace without transfer';
  end if;

  delete from public.organization_members
  where organization_id = p_organization_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.workspace_leave(uuid) from public;
grant execute on function public.workspace_leave(uuid) to authenticated;
grant execute on function public.workspace_leave(uuid) to service_role;

create or replace function public.workspace_delete(
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'workspace_delete requires authenticated user';
  end if;
  if not public.can_owner_org(p_organization_id) then
    raise exception 'only owner can delete workspace';
  end if;
  delete from public.organizations where id = p_organization_id;
end;
$$;

revoke all on function public.workspace_delete(uuid) from public;
grant execute on function public.workspace_delete(uuid) to authenticated;
grant execute on function public.workspace_delete(uuid) to service_role;
