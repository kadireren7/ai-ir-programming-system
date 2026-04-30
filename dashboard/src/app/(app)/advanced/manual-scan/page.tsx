import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ScanPageClient } from "@/app/(app)/scan/scan-client";

export const metadata: Metadata = {
  title: "Manual Scan — Advanced",
  description: "Paste or upload workflow JSON to run a manual governance scan.",
};

function ScanFallback() {
  return (
    <div className="space-y-6 pb-12" aria-busy="true">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-muted/60" />
      <div className="h-72 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
    </div>
  );
}

export default function ManualScanPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Advanced</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Manual Scan</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Paste or upload workflow JSON directly for an on-demand scan. For continuous scanning,{" "}
          <Link href="/sources" className="text-primary hover:underline">connect a source</Link> instead.
        </p>
      </div>

      <Suspense fallback={<ScanFallback />}>
        <ScanPageClient />
      </Suspense>
    </div>
  );
}
