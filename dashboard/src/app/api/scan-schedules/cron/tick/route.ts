import { NextResponse } from "next/server";
import { timingSafeStringEqual } from "@/lib/secure-compare";
import { apiJsonError } from "@/lib/api-json-error";

export const runtime = "nodejs";

/**
 * Future hook for Vercel Cron / external worker. Set `TORQA_CRON_SECRET` and send:
 *   Authorization: Bearer <TORQA_CRON_SECRET>
 * Automatic execution of due schedules is not implemented yet.
 */
export async function POST(request: Request) {
  const secret = process.env.TORQA_CRON_SECRET?.trim();
  if (!secret) {
    return apiJsonError(request, 503, "TORQA_CRON_SECRET is not configured", "service_unavailable");
  }

  const auth = request.headers.get("authorization")?.trim() ?? "";
  const expected = `Bearer ${secret}`;
  if (!timingSafeStringEqual(auth, expected)) {
    return apiJsonError(request, 401, "Unauthorized", "unauthorized");
  }

  return NextResponse.json({
    ok: true,
    processed: 0,
    message: "Cron tick acknowledged; automatic schedule execution is not wired yet.",
  });
}
