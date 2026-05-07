import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: wf, error: wfErr } = await supabase
    .from("workflow_templates")
    .select("id, name, source, external_id, source_id, last_synced_at, risk_score, last_scan_decision, last_scanned_at, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (wfErr) return NextResponse.json({ error: wfErr.message }, { status: 500 });
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Scan history for sparkline + findings (last 20 scans by workflow name)
  let sparkline: { id: string; created_at: string; risk_score: number; decision: string }[] = [];
  let latestFindings: unknown[] = [];
  let latestScanId: string | null = null;

  if (wf.name) {
    const { data: scans } = await supabase
      .from("scan_history")
      .select("id, created_at, result")
      .eq("workflow_name", wf.name)
      .order("created_at", { ascending: false })
      .limit(20);

    const rows = scans ?? [];

    sparkline = rows.map((s) => {
      const r = s.result as { riskScore?: number; status?: string } | null;
      return {
        id: s.id as string,
        created_at: s.created_at as string,
        risk_score: typeof r?.riskScore === "number" ? r.riskScore : 0,
        decision: typeof r?.status === "string" ? r.status : "unknown",
      };
    }).reverse();

    if (rows.length > 0) {
      const latest = rows[0];
      latestScanId = latest.id as string;
      const r = latest.result as { findings?: unknown[] } | null;
      latestFindings = Array.isArray(r?.findings) ? r.findings : [];
    }
  }

  return NextResponse.json({ workflow: wf, sparkline, latestFindings, latestScanId });
}
