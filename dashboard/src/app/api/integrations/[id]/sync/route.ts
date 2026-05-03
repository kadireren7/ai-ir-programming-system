import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncIntegration } from "@/lib/workflow-sync-engine";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing integration id" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: integration } = await supabase
    .from("integrations")
    .select("id,provider,status")
    .eq("id", id)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  if (integration.status !== "connected") {
    return NextResponse.json({ error: "Integration is not connected" }, { status: 409 });
  }

  const result = await syncIntegration(user.id, id);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    added: result.added,
    updated: result.updated,
    unchanged: result.unchanged,
    total: result.total,
  });
}
