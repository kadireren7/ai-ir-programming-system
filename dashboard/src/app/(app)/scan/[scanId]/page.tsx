import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanReportView } from "@/components/scan-report-view";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ scanId: string }>;
};

export default async function ScanDetailPage({ params }: PageProps) {
  const { scanId } = await params;

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createClient();
  if (!supabase) {
    notFound();
  }

  const { data: row, error } = await supabase.from("scan_history").select("*").eq("id", scanId).maybeSingle();

  if (error || !row) {
    notFound();
  }

  const result = row.result;
  if (!isScanApiSuccess(result)) {
    notFound();
  }

  const title = typeof row.workflow_name === "string" && row.workflow_name ? row.workflow_name : "Saved scan";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workflow</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved {new Date(row.created_at as string).toLocaleString()} ·{" "}
            <span className="font-mono">{scanId}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/scan/history" className="text-primary hover:underline">
            ← History
          </Link>
          <Link href="/scan" className="text-primary hover:underline">
            New scan
          </Link>
        </div>
      </div>

      <ScanReportView result={result} showPoweredBanner />
    </div>
  );
}
