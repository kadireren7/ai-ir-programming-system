import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE, isUuid } from "@/lib/workspace-cookie";

export const runtime = "nodejs";

export async function GET() {
  const store = await cookies();
  const value = store.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  if (!value || !isUuid(value)) {
    return NextResponse.json({ organizationId: null });
  }
  return NextResponse.json({ organizationId: value });
}

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
  const organizationId =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { organizationId?: unknown }).organizationId
      : undefined;

  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";

  if (organizationId === null || organizationId === "") {
    store.delete(ACTIVE_ORG_COOKIE);
    return NextResponse.json({ ok: true, organizationId: null });
  }

  if (typeof organizationId !== "string" || !isUuid(organizationId)) {
    return NextResponse.json({ error: "Invalid organizationId" }, { status: 400 });
  }

  const { data: member, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  store.set(ACTIVE_ORG_COOKIE, organizationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true, organizationId });
}
