import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchIntegrationWorkflows } from "@/lib/integration-workflow-fetcher";
import type { ScanSource } from "@/lib/scan-engine";

export type SyncResult =
  | { ok: true; added: number; updated: number; unchanged: number; total: number }
  | { ok: false; error: string };

export async function syncIntegration(
  userId: string,
  integrationId: string
): Promise<SyncResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin client not configured" };

  const fetchResult = await fetchIntegrationWorkflows(integrationId);
  if (!fetchResult.ok) return { ok: false, error: fetchResult.error };

  const { provider, workflows } = fetchResult;
  const source = provider as ScanSource;

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const wf of workflows) {
    const { data: existing } = await admin
      .from("workflow_templates")
      .select("id, content")
      .eq("user_id", userId)
      .eq("source_id", integrationId)
      .eq("external_id", wf.id)
      .maybeSingle();

    const contentJson = wf.content;
    const now = new Date().toISOString();

    if (existing) {
      const contentChanged = JSON.stringify(existing.content) !== JSON.stringify(contentJson);
      if (contentChanged) {
        await admin
          .from("workflow_templates")
          .update({
            content: contentJson,
            name: wf.name,
            last_synced_at: now,
            updated_at: now,
          })
          .eq("id", existing.id);
        updated += 1;
      } else {
        await admin
          .from("workflow_templates")
          .update({ last_synced_at: now })
          .eq("id", existing.id);
        unchanged += 1;
      }
    } else {
      await admin
        .from("workflow_templates")
        .insert({
          user_id: userId,
          source: source,
          name: wf.name.slice(0, 200),
          content: contentJson,
          source_id: integrationId,
          external_id: wf.id,
          last_synced_at: now,
        });
      added += 1;
    }
  }

  await admin.from("sync_logs").insert({
    user_id: userId,
    integration_id: integrationId,
    status: "success",
    added,
    updated,
    unchanged,
  });

  return { ok: true, added, updated, unchanged, total: workflows.length };
}

export async function getLastSyncLog(
  supabase: SupabaseClient,
  integrationId: string
): Promise<{ status: string; added: number; updated: number; unchanged: number; createdAt: string } | null> {
  const { data } = await supabase
    .from("sync_logs")
    .select("status, added, updated, unchanged, created_at")
    .eq("integration_id", integrationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    status: typeof data.status === "string" ? data.status : "unknown",
    added: typeof data.added === "number" ? data.added : 0,
    updated: typeof data.updated === "number" ? data.updated : 0,
    unchanged: typeof data.unchanged === "number" ? data.unchanged : 0,
    createdAt: typeof data.created_at === "string" ? data.created_at : "",
  };
}
