import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeStringEqual } from "@/lib/secure-compare";
import { syncIntegration } from "@/lib/workflow-sync-engine";

export const runtime = "nodejs";

// n8n sends workflow.* events to this endpoint when configured as a webhook credential
// Header: X-Torqa-Token <secret stored in integration config>
export async function POST(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const { data: row } = await admin
    .from("integrations")
    .select("id, user_id, config, status")
    .eq("id", integrationId)
    .eq("provider", "n8n")
    .eq("status", "connected")
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const cfg = (row.config ?? {}) as Record<string, unknown>;
  const secret = typeof cfg.webhookSecret === "string" ? cfg.webhookSecret : "";

  if (secret) {
    const incoming = request.headers.get("x-torqa-token") ?? "";
    if (!timingSafeStringEqual(incoming, secret)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fire sync in background — respond immediately so n8n doesn't timeout
  void syncIntegration(String(row.user_id), integrationId).catch(() => {});

  return NextResponse.json({ ok: true, queued: true });
}
