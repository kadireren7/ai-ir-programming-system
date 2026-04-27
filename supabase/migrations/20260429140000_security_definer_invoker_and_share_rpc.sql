-- Clear remaining Security Advisor issues where safe:
--   0028 get_scan_by_share_id: no anon/authenticated EXECUTE (server uses service_role only).
--   0029: switch RPCs to SECURITY INVOKER where RLS already matches the RPC checks.
--
-- Still SECURITY DEFINER + authenticated EXECUTE (PostgREST RPC; advisor will warn):
--   accept_organization_invite — must read organization_invites by token (RLS is admin-only).
--   notify_workspace_members — inserts rows for other users (in_app_notifications_insert_self only).
--   workspace_members — joins auth.users for emails (no invoker-safe path without schema changes).

-- ---------------------------------------------------------------------------
-- Public share snapshot: service_role / server-side only
-- ---------------------------------------------------------------------------
revoke execute on function public.get_scan_by_share_id(text) from anon, authenticated, PUBLIC;
grant execute on function public.get_scan_by_share_id(text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS additions required for SECURITY INVOKER deletes / activity insert
-- ---------------------------------------------------------------------------
create policy organizations_delete_owner on public.organizations
  for delete using (public.can_owner_org(id));

create policy organization_members_delete_self_leave on public.organization_members
  for delete using (user_id = auth.uid() and role <> 'owner');

create policy workspace_activity_logs_insert_member on public.workspace_activity_logs
  for insert with check (
    public.is_org_member(organization_id)
    and actor_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- SECURITY INVOKER (RLS enforces the same intent as previous DEFINER bodies)
-- ---------------------------------------------------------------------------
alter function public.create_organization(text, citext) security invoker;

alter function public.invite_organization_member(uuid, citext, text) security invoker;

alter function public.log_workspace_activity(uuid, text, text, jsonb) security invoker;

alter function public.workspace_delete(uuid) security invoker;

alter function public.workspace_leave(uuid) security invoker;

alter function public.workspace_remove_member(uuid, uuid) security invoker;

alter function public.workspace_rename(uuid, text) security invoker;

alter function public.workspace_transfer_ownership(uuid, uuid) security invoker;

alter function public.workspace_update_member_role(uuid, uuid, text) security invoker;
