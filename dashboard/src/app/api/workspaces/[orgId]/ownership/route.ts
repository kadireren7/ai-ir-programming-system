import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orgId: string }> };

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
  if (!isPlainObject(body) || typeof body.newOwnerUserId !== "string") {
    return NextResponse.json({ error: 'Field "newOwnerUserId" is required' }, { status: 400 });
  }

  const { error } = await supabase.rpc("workspace_transfer_ownership", {
    p_organization_id: orgId,
    p_new_owner_user_id: body.newOwnerUserId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logWorkspaceActivity(supabase, orgId, "workspace.ownership_transferred", body.newOwnerUserId, {});
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "Workspace ownership transferred",
    "Workspace ownership has been transferred to another member.",
    "critical",
    { newOwnerUserId: body.newOwnerUserId }
  );

  return NextResponse.json({ ok: true });
}
