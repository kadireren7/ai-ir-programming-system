import type { SupabaseClient } from "@supabase/supabase-js";

type ActivityMetadata = Record<string, unknown>;

export async function logWorkspaceActivity(
  supabase: SupabaseClient,
  organizationId: string | null,
  action: string,
  target: string | null,
  metadata: ActivityMetadata = {}
): Promise<void> {
  if (!organizationId) return;
  try {
    await supabase.rpc("log_workspace_activity", {
      p_organization_id: organizationId,
      p_action: action,
      p_target: target,
      p_metadata: metadata,
    });
  } catch {
    /* ignore activity telemetry failures */
  }
}

export async function notifyWorkspaceMembers(
  supabase: SupabaseClient,
  organizationId: string | null,
  title: string,
  body: string,
  severity: "info" | "warning" | "critical" = "info",
  metadata: ActivityMetadata = {}
): Promise<void> {
  if (!organizationId) return;
  try {
    await supabase.rpc("notify_workspace_members", {
      p_organization_id: organizationId,
      p_title: title,
      p_body: body,
      p_severity: severity,
      p_metadata: metadata,
    });
  } catch {
    /* ignore notification fanout failures */
  }
}
