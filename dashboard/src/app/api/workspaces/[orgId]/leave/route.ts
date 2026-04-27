import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ orgId: string }> };

export async function POST(_request: Request, context: Ctx) {
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

  const { error } = await supabase.rpc("workspace_leave", {
    p_organization_id: orgId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logWorkspaceActivity(supabase, orgId, "member.left", user.id, {});
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "Member left workspace",
    "A member left the workspace.",
    "info",
    { userId: user.id }
  );

  return NextResponse.json({ ok: true });
}
