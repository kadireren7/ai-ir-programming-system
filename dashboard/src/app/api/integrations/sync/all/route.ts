import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncIntegration } from "@/lib/workflow-sync-engine";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const { data: integrations } = await admin
    .from("integrations")
    .select("id, provider")
    .eq("user_id", user.id)
    .eq("status", "connected");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, results: [] });
  }

  // Sync each integration sequentially to avoid hammering provider APIs
  const results: { id: string; provider: string; ok: boolean; added?: number; updated?: number; error?: string }[] = [];

  for (const integration of integrations) {
    try {
      const result = await syncIntegration(user.id, integration.id as string);
      if (result.ok) {
        results.push({
          id: integration.id as string,
          provider: integration.provider as string,
          ok: true,
          added: result.added,
          updated: result.updated,
        });
      } else {
        results.push({
          id: integration.id as string,
          provider: integration.provider as string,
          ok: false,
          error: result.error,
        });
      }
    } catch (e) {
      results.push({
        id: integration.id as string,
        provider: integration.provider as string,
        ok: false,
        error: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const totalAdded = results.reduce((s, r) => s + (r.added ?? 0), 0);
  const totalUpdated = results.reduce((s, r) => s + (r.updated ?? 0), 0);

  return NextResponse.json({
    ok: true,
    synced: integrations.length,
    succeeded,
    failed: integrations.length - succeeded,
    totalAdded,
    totalUpdated,
    results,
  });
}
