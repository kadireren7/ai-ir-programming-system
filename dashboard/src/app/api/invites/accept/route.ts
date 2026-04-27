import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/workspace-cookie";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
  const token =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { token?: unknown }).token
      : undefined;
  if (typeof token !== "string" || !isUuid(token)) {
    return NextResponse.json({ error: 'Field "token" must be a UUID string' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("accept_organization_invite", {
    p_token: token,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const orgId = data as string;
  await logWorkspaceActivity(supabase, orgId, "member.joined", user.id, {});
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "New member joined",
    "A user accepted an invite and joined the workspace.",
    "info",
    { userId: user.id }
  );

  return NextResponse.json({ organizationId: orgId });
}
