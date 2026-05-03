import Link from "next/link";
import { notFound } from "next/navigation";
import { GovernanceReport } from "@/components/governance-report";
import type { ScanHistoryEntry } from "@/components/governance-report";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ scanId: string }>;
};

export default async function ScanDetailPage({ params }: PageProps) {
  const { scanId } = await params;

  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: row, error } = await supabase
    .from("scan_history")
    .select("id, workflow_name, source, created_at, result")
    .eq("id", scanId)
    .maybeSingle();

  if (error || !row) notFound();

  const result = row.result;
  if (!isScanApiSuccess(result)) notFound();

  const workflowName = typeof row.workflow_name === "string" && row.workflow_name
    ? row.workflow_name
    : undefined;

  // Fetch scan history for same workflow (timeline)
  let scanHistory: ScanHistoryEntry[] = [];
  if (workflowName) {
    const { data: histRows } = await supabase
      .from("scan_history")
      .select("id, created_at, result")
      .eq("workflow_name", workflowName)
      .order("created_at", { ascending: false })
      .limit(10);

    scanHistory = (histRows ?? [])
      .map((r) => {
        const res = r.result as { status?: string; riskScore?: number } | null;
        return {
          id: r.id as string,
          created_at: r.created_at as string,
          status: typeof res?.status === "string" ? res.status : "—",
          riskScore: typeof res?.riskScore === "number" ? res.riskScore : 0,
        };
      });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Governance</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            {workflowName ?? "Scan report"}
          </h1>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/scan/history" className="text-muted-foreground hover:text-foreground">← History</Link>
          <Link href="/scan" className="text-primary hover:underline">New scan</Link>
        </div>
      </div>

      <GovernanceReport
        result={result}
        workflowName={workflowName}
        scanId={scanId}
        createdAt={row.created_at as string}
        scanHistory={scanHistory}
        supabaseConfigured={isSupabaseConfigured()}
        pdfExportUrl={`/api/scans/${encodeURIComponent(scanId)}/pdf`}
        pdfFilename={`torqa-report-${scanId}.pdf`}
      />
    </div>
  );
}
