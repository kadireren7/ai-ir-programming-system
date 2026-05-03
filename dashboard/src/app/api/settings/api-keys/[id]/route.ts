import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiJsonDatabaseError } from "@/lib/api-json-error";
import { getActiveOrganizationId } from "@/lib/workspace-scope";
import { logWorkspaceActivity } from "@/lib/workspace-activity";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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

  const revoke = (body as Record<string, unknown>).revoke;
  if (revoke !== true) {
    return NextResponse.json({ error: 'Only {"revoke": true} is supported' }, { status: 400 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid key id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (error) {
    return apiJsonDatabaseError(request);
  }

  const orgId = await getActiveOrganizationId();
  void logWorkspaceActivity(supabase, orgId, "api_key.revoked", id, { keyId: id }).catch(() => {});

  return NextResponse.json({ ok: true });
}
