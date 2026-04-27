import { NextResponse } from "next/server";
import { getTorqaHealthSnapshot, SCAN_PROVIDER_IDS } from "@/lib/health-status";

export const runtime = "nodejs";

/**
 * Lightweight liveness/readiness-style snapshot for operators and load balancers.
 * No secrets; safe without authentication.
 */
export async function GET() {
  const snapshot = getTorqaHealthSnapshot();
  /** Always HTTP 200 so load balancers can use the path for liveness; use `status` field for readiness hints. */
  return NextResponse.json(
    {
      ...snapshot,
      scanProviderIdsSupported: [...SCAN_PROVIDER_IDS],
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    }
  );
}
