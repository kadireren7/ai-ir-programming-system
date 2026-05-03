import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import { sanitizeBaseUrl } from "@/lib/integrations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isPlainObject(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const baseUrl = sanitizeBaseUrl(typeof body.baseUrl === "string" ? body.baseUrl : "");
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  if (!baseUrl) return NextResponse.json({ ok: false, error: "Base URL must start with http:// or https://" });
  if (!apiKey)  return NextResponse.json({ ok: false, error: "API key is required" });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch(`${baseUrl}/api/v1/workflows?limit=1`, {
      headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: `n8n returned HTTP ${res.status}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Connection failed" });
  } finally {
    clearTimeout(t);
  }
}
