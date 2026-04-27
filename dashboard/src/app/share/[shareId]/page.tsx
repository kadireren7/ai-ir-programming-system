import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { ScanReportView } from "@/components/scan-report-view";
import { isSupabaseConfigured } from "@/lib/env";
import { fetchSharedScanByShareId, isSharedScanFetchConfigured } from "@/lib/share-scan";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shareId: string }>;
};

export default async function SharedScanPage({ params }: PageProps) {
  const { shareId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-xl border border-border/80 bg-muted/10 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Shared reports require Supabase. Configure <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and apply migrations (including <code className="font-mono text-xs">get_scan_by_share_id</code>).
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!isSharedScanFetchConfigured()) {
    return (
      <div className="rounded-xl border border-border/80 bg-muted/10 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Public share pages load snapshots with the Supabase service role on the server. Set{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> (never expose as{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_*</code>) alongside your public Supabase env vars.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const payload = await fetchSharedScanByShareId(shareId);
  if (!payload) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 sm:px-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Shared Torqa scan report</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This page is <strong className="font-medium text-foreground">public</strong> to anyone with the link. Do
              not share if the snapshot contains sensitive workflow or environment details.
            </p>
          </div>
        </div>
      </div>

      <ScanReportView result={payload.result} showPoweredBanner variant="shared" />
    </div>
  );
}
