import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isPlainObject } from "@/lib/json-guards";

export const runtime = "nodejs";

/**
 * POST /api/sources/agent/webhook
 *
 * Called when an agent's definition changes. Triggers a re-scan for all
 * workflow_templates of source "ai-agent" that reference the given agent id.
 *
 * Auth: Bearer token stored as api_key on the integration row.
 *
 * Body: { agent_id: string; definition?: unknown }
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud mode not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 });
  }

  // Validate Bearer token
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const agentId = typeof body.agent_id === "string" ? body.agent_id.trim() : null;
  if (!agentId) {
    return NextResponse.json({ error: "Field agent_id required" }, { status: 400 });
  }

  // Find ALL ai-agent integrations and validate token against stored api_key.
  // Auth is purely token-based (no session cookie) so we scan all matching integrations.
  const { data: integrations, error: intErr } = await supabase
    .from("integrations")
    .select("id, user_id, config")
    .eq("provider", "ai-agent")
    .eq("status", "connected");

  if (intErr) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Find the integration whose api_key matches the token
  const integration = (integrations ?? []).find((i) => {
    const cfg = i.config as Record<string, unknown> | null;
    const key = typeof cfg?.api_key === "string" ? cfg.api_key : null;
    return key && key === token;
  });

  if (!integration) {
    return NextResponse.json({ error: "Invalid token or agent source not found" }, { status: 403 });
  }

  // Workflows scoped to this specific integration + matching agent_id
  const { data: workflows } = await supabase
    .from("workflow_templates")
    .select("id, name, external_id")
    .eq("source_id", integration.id)
    .eq("source", "ai-agent")
    .eq("user_id", integration.user_id as string);

  const affected = (workflows ?? []).filter(
    (w) => w.external_id === agentId
  );

  if (affected.length === 0) {
    return NextResponse.json({ ok: true, re_scanned: 0, message: "No matching workflows" });
  }

  // Mark workflows as needing re-scan by clearing last_scanned_at
  const ids = affected.map((w) => w.id);
  const { error: updateErr } = await supabase
    .from("workflow_templates")
    .update({ last_scanned_at: null, last_scan_decision: null, risk_score: null })
    .in("id", ids);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    re_scanned: affected.length,
    workflow_ids: ids,
    message: `Cleared scan state for ${affected.length} workflow(s). Next sync will trigger re-scan.`,
  });
}
