import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Future hook for Vercel Cron / external worker. Set `TORQA_CRON_SECRET` and send:
 *   Authorization: Bearer <TORQA_CRON_SECRET>
 * Automatic execution of due schedules is not implemented yet.
 */
export async function POST(request: Request) {
  const secret = process.env.TORQA_CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "TORQA_CRON_SECRET is not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    processed: 0,
    message: "Cron tick acknowledged; automatic schedule execution is not wired yet.",
  });
}
