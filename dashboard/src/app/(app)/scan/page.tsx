import type { Metadata } from "next";
import { Suspense } from "react";
import { ScanPageClient } from "./scan-client";

export const metadata: Metadata = {
  title: "Scan",
  description: "Run a workflow security scan and review findings.",
};

function ScanFallback() {
  return (
    <div className="space-y-6 pb-12" aria-busy="true">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-muted/60" />
      <div className="h-72 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<ScanFallback />}>
      <ScanPageClient />
    </Suspense>
  );
}
