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
    .eq("user_id", user.id)
    .eq("provider", "zapier")
    .eq("status", "connected")
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Zapier integration not connected" }, { status: 404 });

  let apiKey = "";
  if (typeof row.token_id === "string") {
    const { data: t } = await admin.from("provider_tokens").select("encrypted_token").eq("id", row.token_id).single();
    if (t?.encrypted_token) {
      try { apiKey = decryptToken(t.encrypted_token); } catch { /* */ }
    }
  }
  if (!apiKey) return NextResponse.json({ error: "Could not resolve Zapier API key" }, { status: 500 });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetch("https://api.zapier.com/v1/zaps?limit=100&status=on", {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return NextResponse.json({ error: `Zapier API ${res.status}` }, { status: 502 });
    const data = (await res.json()) as { zaps?: unknown[] };
    return NextResponse.json({ zaps: data.zaps ?? [], total: (data.zaps ?? []).length });
  } catch {
    return NextResponse.json({ error: "Zapier API unreachable" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
