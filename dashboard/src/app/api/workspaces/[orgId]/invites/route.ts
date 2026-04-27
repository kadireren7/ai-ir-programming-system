import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { orgId } = await context.params;
  if (!orgId) {
    return NextResponse.json({ error: "Missing org id" }, { status: 400 });
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

  const { data, error } = await supabase
    .from("organization_invites")
    .select("id, email, role, expires_at, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invites: data ?? [] });
}

export async function POST(request: Request, context: Ctx) {
  const { orgId } = await context.params;
  if (!orgId) {
    return NextResponse.json({ error: "Missing org id" }, { status: 400 });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const rec = body as { email?: unknown; role?: unknown };
  const email = rec.email;
  const role = rec.role;
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: 'Field "email" is required' }, { status: 400 });
  }
  if (role !== "admin" && role !== "member") {
    return NextResponse.json({ error: 'Field "role" must be "admin" or "member"' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("invite_organization_member", {
    p_organization_id: orgId,
    p_email: email.trim(),
    p_role: role,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const raw = data as { token?: string; expires_at?: string } | { token?: string; expires_at?: string }[] | null;
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const row = rows[0];
  if (!row?.token) {
    return NextResponse.json({ error: "Invite failed" }, { status: 500 });
  }

  await logWorkspaceActivity(supabase, orgId, "invite.sent", email.trim(), { role });
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "Workspace invite sent",
    `An invite was sent to ${email.trim()} as ${role}.`,
    "info",
    { email: email.trim(), role }
  );

  return NextResponse.json({
    token: row.token,
    expiresAt: row.expires_at ?? null,
  });
}
