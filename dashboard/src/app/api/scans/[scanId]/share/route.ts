import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function absoluteOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

function newShareId(): string {
  return `tq_${randomBytes(24).toString("hex")}`;
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await ctx.params;
  if (!isUuid(scanId)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: selErr } = await supabase
    .from("scan_history")
    .select("id, share_id, organization_id")
    .eq("id", scanId)
    .maybeSingle();

  if (selErr || !row) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const existing = typeof row.share_id === "string" && row.share_id.length > 0 ? row.share_id : null;
  const shareId = existing ?? newShareId();

  if (!existing) {
    const { error: upErr } = await supabase.from("scan_history").update({ share_id: shareId }).eq("id", scanId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  const origin = absoluteOrigin(request);
  const shareUrl = `${origin}/share/${shareId}`;
  const orgId = typeof row.organization_id === "string" ? row.organization_id : null;
  await logWorkspaceActivity(supabase, orgId, "report.shared", scanId, { shareId, reused: Boolean(existing) });
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "Scan report shared",
    "A scan report public share link was generated.",
    "warning",
    { scanId, shareId, reused: Boolean(existing) }
  );
  return NextResponse.json({ shareUrl, shareId, reused: Boolean(existing) });
}
