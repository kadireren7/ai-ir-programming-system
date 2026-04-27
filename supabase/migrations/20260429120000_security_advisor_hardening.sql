-- Supabase Database Security Advisor hardening
--
-- Addresses:
--   0011 function_search_path_mutable — pin search_path on public.set_updated_at
--   0014 extension_in_public — move citext out of public
--   0028 anon_security_definer_function_executable — revoke EXECUTE from anon (share RPC stays anon-callable)
--   handle_new_user — remove PostgREST RPC surface; keep trigger via supabase_auth_admin
--
-- Remaining advisories (not SQL-fixable in-repo without larger refactors):
--   0029 authenticated_security_definer_function_executable — intentional for dashboard JWT RPCs;
--     clearing it requires moving RPCs behind server-only service role or SECURITY INVOKER rewrites.
--   auth_leaked_password_protection — enable in Dashboard: Authentication → Providers/Password → leaked password protection.

-- ---------------------------------------------------------------------------
-- 0011: role-mutable search_path on trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 0014: extension not in public (Supabase convention: extensions schema)
-- ---------------------------------------------------------------------------
create schema if not exists extensions;

alter extension citext set schema extensions;

-- ---------------------------------------------------------------------------
-- 0028: anon must not invoke SECURITY DEFINER RPCs (except public share read)
-- Re-grant authenticated + service_role after REVOKE FROM PUBLIC so explicit
-- grants survive regardless of default PUBLIC execute.
-- ---------------------------------------------------------------------------
revoke execute on function public.accept_organization_invite(uuid) from anon, PUBLIC;
grant execute on function public.accept_organization_invite(uuid) to authenticated, service_role;

revoke execute on function public.create_organization(text, citext) from anon, PUBLIC;
grant execute on function public.create_organization(text, citext) to authenticated, service_role;

revoke execute on function public.invite_organization_member(uuid, citext, text) from anon, PUBLIC;
grant execute on function public.invite_organization_member(uuid, citext, text) to authenticated, service_role;

revoke execute on function public.log_workspace_activity(uuid, text, text, jsonb) from anon, PUBLIC;
grant execute on function public.log_workspace_activity(uuid, text, text, jsonb) to authenticated, service_role;

revoke execute on function public.notify_workspace_members(uuid, text, text, text, jsonb) from anon, PUBLIC;
grant execute on function public.notify_workspace_members(uuid, text, text, text, jsonb) to authenticated, service_role;

revoke execute on function public.workspace_delete(uuid) from anon, PUBLIC;
grant execute on function public.workspace_delete(uuid) to authenticated, service_role;

revoke execute on function public.workspace_leave(uuid) from anon, PUBLIC;
grant execute on function public.workspace_leave(uuid) to authenticated, service_role;

revoke execute on function public.workspace_members(uuid) from anon, PUBLIC;
grant execute on function public.workspace_members(uuid) to authenticated, service_role;

revoke execute on function public.workspace_remove_member(uuid, uuid) from anon, PUBLIC;
grant execute on function public.workspace_remove_member(uuid, uuid) to authenticated, service_role;

revoke execute on function public.workspace_rename(uuid, text) from anon, PUBLIC;
grant execute on function public.workspace_rename(uuid, text) to authenticated, service_role;

revoke execute on function public.workspace_transfer_ownership(uuid, uuid) from anon, PUBLIC;
grant execute on function public.workspace_transfer_ownership(uuid, uuid) to authenticated, service_role;

revoke execute on function public.workspace_update_member_role(uuid, uuid, text) from anon, PUBLIC;
grant execute on function public.workspace_update_member_role(uuid, uuid, text) to authenticated, service_role;

-- Public share links: anon + authenticated must keep EXECUTE (still SECURITY DEFINER by design).
revoke execute on function public.get_scan_by_share_id(text) from PUBLIC;
grant execute on function public.get_scan_by_share_id(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- handle_new_user: not an RPC; trigger runs as supabase_auth_admin
-- ---------------------------------------------------------------------------
grant usage on schema public to supabase_auth_admin;

revoke execute on function public.handle_new_user() from anon, authenticated, PUBLIC;
grant execute on function public.handle_new_user() to supabase_auth_admin;
