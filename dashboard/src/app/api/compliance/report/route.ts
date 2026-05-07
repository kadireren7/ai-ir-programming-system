import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildComplianceReport } from "@/lib/compliance-mappings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "30", 10), 365);
  const framework = url.searchParams.get("framework") ?? "both";

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: scans } = await supabase
    .from("scan_history")
    .select("id, result, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  const allFindings: { rule_id: string; severity: string; workflow_name?: string; scan_id?: string }[] = [];

  for (const scan of scans ?? []) {
    const result = scan.result as Record<string, unknown> | null;
    if (!result) continue;
    const findings = Array.isArray(result.findings) ? result.findings : [];
    for (const f of findings) {
      if (f && typeof f === "object" && "rule_id" in f) {
        allFindings.push({
          rule_id: f.rule_id as string,
          severity: (f.severity as string) ?? "info",
          scan_id: scan.id as string,
        });
      }
    }
  }

  const report = buildComplianceReport(allFindings);

  // Filter by framework if requested
  const summaries = framework === "soc2"
    ? report.summaries.filter((s) => s.framework === "soc2")
    : framework === "iso27001"
      ? report.summaries.filter((s) => s.framework === "iso27001")
      : report.summaries;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    periodDays: days,
    totalScans: scans?.length ?? 0,
    totalFindings: allFindings.length,
    entries: report.entries,
    summaries,
  });
}
