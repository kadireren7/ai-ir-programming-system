import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE, isUuid } from "@/lib/workspace-cookie";

/** Active workspace id from cookie, or null (personal scope). */
export async function getActiveOrganizationId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(ACTIVE_ORG_COOKIE)?.value;
  if (!raw || !isUuid(raw)) return null;
  return raw;
}

/** Active org id when the signed-in user is a member (matches scan history / schedules scoping). */
export async function resolveScopedOrganizationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const activeOrg = await getActiveOrganizationId();
  if (!activeOrg) return null;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", activeOrg)
    .eq("user_id", userId)
    .maybeSingle();
  return membership ? activeOrg : null;
}

/** Alias for list/create APIs that scope rows to the active workspace when applicable. */
export const resolveListOrganizationId = resolveScopedOrganizationId;
