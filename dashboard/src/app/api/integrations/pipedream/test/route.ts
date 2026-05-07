import { NextResponse } from "next/server";
import { isPlainObject } from "@/lib/json-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" });
  }
  if (!isPlainObject(body)) return NextResponse.json({ ok: false, error: "Invalid body" });

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) return NextResponse.json({ ok: false, error: "apiKey required" });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch("https://api.pipedream.com/v1/users/me", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: `Pipedream API ${res.status}` });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Connection failed — check API key" });
  } finally {
    clearTimeout(t);
  }
}
