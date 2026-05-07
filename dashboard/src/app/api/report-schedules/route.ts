import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import { getActiveOrganizationId } from "@/lib/workspace-scope";

export const runtime = "nodejs";

const VALID_TYPES = new Set(["compliance", "audit", "scan_summary"]);
const VALID_FREQUENCIES = new Set(["daily", "weekly", "monthly"]);
const VALID_FRAMEWORKS = new Set(["soc2", "iso27001", "both", null]);

function computeNextSend(frequency: string): string {
  const now = new Date();
  if (frequency === "daily") {
    now.setDate(now.getDate() + 1);
    now.setHours(8, 0, 0, 0);
  } else if (frequency === "weekly") {
    now.setDate(now.getDate() + 7);
    now.setHours(8, 0, 0, 0);
  } else {
    now.setMonth(now.getMonth() + 1);
    now.setDate(1);
    now.setHours(8, 0, 0, 0);
  }
  return now.toISOString();
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: schedules, error } = await supabase
    .from("report_schedules")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: schedules ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isPlainObject(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : null;
  const reportType = typeof body.reportType === "string" && VALID_TYPES.has(body.reportType) ? body.reportType : "compliance";
  const frequency = typeof body.frequency === "string" && VALID_FREQUENCIES.has(body.frequency) ? body.frequency : "weekly";
  const deliveryEmail = typeof body.deliveryEmail === "string" ? body.deliveryEmail.trim().toLowerCase() : "";
  const framework = typeof body.framework === "string" && VALID_FRAMEWORKS.has(body.framework) ? body.framework : "both";

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!deliveryEmail || !deliveryEmail.includes("@")) return NextResponse.json({ error: "valid deliveryEmail required" }, { status: 400 });

  const orgId = await getActiveOrganizationId();

  const { data, error } = await supabase
    .from("report_schedules")
    .insert({
      user_id: user.id,
      organization_id: orgId ?? null,
      name,
      report_type: reportType,
      frequency,
      delivery_email: deliveryEmail,
      framework,
      enabled: true,
      next_send_at: computeNextSend(frequency),
    })
    .select("id")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
