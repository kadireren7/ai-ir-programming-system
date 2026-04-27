import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orgId: string; userId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { orgId, userId } = await context.params;
  if (!orgId || !userId) {
    return NextResponse.json({ error: "Missing org id or user id" }, { status: 400 });
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
  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const role = body.role;
  if (role !== "admin" && role !== "member") {
    return NextResponse.json({ error: 'Field "role" must be "admin" or "member"' }, { status: 400 });
  }

  const { error } = await supabase.rpc("workspace_update_member_role", {
    p_organization_id: orgId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logWorkspaceActivity(supabase, orgId, "member.role_changed", userId, { role });
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "Workspace role changed",
    `A member role was updated to ${role}.`,
    "warning",
    { userId, role }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Ctx) {
  const { orgId, userId } = await context.params;
  if (!orgId || !userId) {
    return NextResponse.json({ error: "Missing org id or user id" }, { status: 400 });
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

  const { error } = await supabase.rpc("workspace_remove_member", {
    p_organization_id: orgId,
    p_user_id: userId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logWorkspaceActivity(supabase, orgId, "member.removed", userId, {});
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "Member removed",
    "A member was removed from the workspace.",
    "warning",
    { userId }
  );

  return NextResponse.json({ ok: true });
}
