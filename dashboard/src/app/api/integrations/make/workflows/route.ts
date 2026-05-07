import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/token-crypto";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const { data: row } = await admin
    .from("integrations")
    .select("id, token_id, config")
    .eq("user_id", user.id).eq("provider", "make").eq("status", "connected")
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Make integration not connected" }, { status: 404 });

  const cfg = (row.config ?? {}) as Record<string, unknown>;
  const zone   = typeof cfg.zone   === "string" ? cfg.zone   : "eu1";
  const teamId = typeof cfg.teamId === "string" ? cfg.teamId : null;
  const domain = `https://${zone}.make.com`;

  let apiKey = "";
  if (typeof row.token_id === "string") {
    const { data: t } = await admin.from("provider_tokens").select("encrypted_token").eq("id", row.token_id).single();
    if (t?.encrypted_token) {
      try { apiKey = decryptToken(t.encrypted_token); } catch { /* */ }
    }
  }
  if (!apiKey) return NextResponse.json({ error: "Could not resolve Make API key" }, { status: 500 });

  const scenariosUrl = teamId
    ? `${domain}/api/v2/scenarios?teamId=${teamId}&pg%5Blimit%5D=100`
    : `${domain}/api/v2/scenarios?pg%5Blimit%5D=100`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetch(scenariosUrl, {
      headers: { Authorization: `Token ${apiKey}`, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return NextResponse.json({ error: `Make API ${res.status}` }, { status: 502 });
    const data = (await res.json()) as { scenarios?: unknown[] };
    return NextResponse.json({ scenarios: data.scenarios ?? [], total: (data.scenarios ?? []).length });
  } catch {
    return NextResponse.json({ error: "Make API unreachable" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
