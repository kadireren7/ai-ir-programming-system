import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ orgId: string }> };

export async function PATCH(request: Request, context: Ctx) {
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
  if (!isPlainObject(body) || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: 'Field "name" must be non-empty string' }, { status: 400 });
  }
  const name = body.name.trim().slice(0, 200);
  const { error } = await supabase.rpc("workspace_rename", {
    p_organization_id: orgId,
    p_name: name,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logWorkspaceActivity(supabase, orgId, "workspace.renamed", name, {});
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "Workspace renamed",
    `Workspace name updated to "${name}".`,
    "info",
    { name }
  );

  return NextResponse.json({ ok: true, name });
}

export async function DELETE(_request: Request, context: Ctx) {
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

  const { error } = await supabase.rpc("workspace_delete", {
    p_organization_id: orgId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
