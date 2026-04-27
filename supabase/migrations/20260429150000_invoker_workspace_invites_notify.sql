-- Final Security Advisor 0029 cleanup for remaining DEFINER RPCs:
--   accept_organization_invite, notify_workspace_members, workspace_members
-- → SECURITY INVOKER with matching RLS / profiles.email for directory.
--
-- auth_leaked_password_protection: not a database migration; enable in Supabase Dashboard
-- (Authentication → Email provider → “Prevent use of leaked passwords”) when your plan supports it.

-- ---------------------------------------------------------------------------
-- profiles.email: mirror auth email for org-safe member directory (no auth.users join)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email citext;

update public.profiles p
set email = u.email::citext
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email::citext;

create index if not exists profiles_email_lower_idx on public.profiles (lower(email::text));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.email::citext
  );
  return new;
end;
$$;

create or replace function public.sync_profile_email_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email::citext where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute function public.sync_profile_email_from_auth_user();

revoke execute on function public.sync_profile_email_from_auth_user() from anon, authenticated, PUBLIC;
grant execute on function public.sync_profile_email_from_auth_user() to supabase_auth_admin;

-- Peers in the same workspace may read display + email for the member list.
create policy profiles_select_org_peers on public.profiles
  for select using (
    exists (
      select 1
      from public.organization_members m_self
      join public.organization_members m_peer
        on m_peer.organization_id = m_self.organization_id
       and m_peer.user_id = id
      where m_self.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Invites: invitee can read/delete rows where the invite email matches JWT email
-- ---------------------------------------------------------------------------
create policy organization_invites_select_by_invitee on public.organization_invites
  for select using (
    lower(trim(both from email::text)) = lower(trim(both from coalesce(auth.jwt() ->> 'email', '')))
  );

create policy organization_invites_delete_by_invitee on public.organization_invites
  for delete using (
    lower(trim(both from email::text)) = lower(trim(both from coalesce(auth.jwt() ->> 'email', '')))
  );

create or replace function public.accept_organization_invite(p_token uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_inv public.organization_invites%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'accept_organization_invite requires an authenticated user';
  end if;

  select * into v_inv
  from public.organization_invites
  where token = p_token;

  if not found then
    raise exception 'invalid or expired invite';
  end if;

  if v_inv.expires_at < now() then
    delete from public.organization_invites where id = v_inv.id;
    raise exception 'invite expired';
  end if;

  v_email := coalesce(auth.jwt() ->> 'email', '');
  if lower(trim(both from v_email)) <> lower(trim(both from v_inv.email::text)) then
    raise exception 'signed-in email does not match invite';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_inv.organization_id, auth.uid(), v_inv.role)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  delete from public.organization_invites where id = v_inv.id;
  return v_inv.organization_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- In-app org broadcast: members may insert notifications for co-members (same org)
-- ---------------------------------------------------------------------------
create policy in_app_notifications_insert_org_broadcast on public.in_app_notifications
  for insert with check (
    exists (
      select 1
      from public.organization_members m_self
      join public.organization_members m_recipient
        on m_recipient.organization_id = m_self.organization_id
       and m_recipient.user_id = in_app_notifications.user_id
      where m_self.user_id = auth.uid()
    )
  );

create or replace function public.notify_workspace_members(
  p_organization_id uuid,
  p_title text,
  p_body text,
  p_severity text default 'info',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
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

-- ---------------------------------------------------------------------------
-- Member directory without auth.users join
-- ---------------------------------------------------------------------------
create or replace function public.workspace_members(p_organization_id uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.user_id,
    coalesce(p.email::text, ''),
    m.role,
    m.created_at
  from public.organization_members m
  join public.profiles p on p.id = m.user_id
  where m.organization_id = p_organization_id
    and public.is_org_member(p_organization_id);
$$;
