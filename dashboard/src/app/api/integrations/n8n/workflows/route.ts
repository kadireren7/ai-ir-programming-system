import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/token-crypto";

export const runtime = "nodejs";

async function resolveN8nCredentials(userId: string): Promise<{ baseUrl: string; apiKey: string } | null> {
  const admin = createAdminClient();
  if (admin) {
    const { data: integration } = await admin
      .from("integrations")
      .select("config,token_id")
      .eq("user_id", userId)
      .eq("provider", "n8n")
      .eq("status", "connected")
      .is("organization_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (integration?.token_id && typeof integration.config === "object" && integration.config !== null) {
      const cfg = integration.config as Record<string, unknown>;
      const baseUrl = typeof cfg.baseUrl === "string" ? cfg.baseUrl : "";
      if (baseUrl) {
        const { data: tokenRow } = await admin
          .from("provider_tokens")
          .select("encrypted_token")
          .eq("id", integration.token_id)
          .single();

        if (tokenRow?.encrypted_token) {
          try {
            const apiKey = decryptToken(tokenRow.encrypted_token);
            return { baseUrl, apiKey };
          } catch {
            // decryption failed — fall through to env var
          }
        }
      }
    }
  }

  // Env var fallback (kept for backward compat)
  const base = process.env.N8N_BASE_URL?.trim().replace(/\/$/, "");
  const key  = process.env.N8N_API_KEY?.trim();
  if (base && key) return { baseUrl: base, apiKey: key };

  return null;
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creds = await resolveN8nCredentials(user.id);
  if (!creds) {
    return NextResponse.json(
      { error: "n8n not connected. Connect via Sources or set N8N_BASE_URL + N8N_API_KEY." },
      { status: 503 }
    );
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(`${creds.baseUrl}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": creds.apiKey, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return NextResponse.json({ error: `n8n HTTP ${res.status}` }, { status: 502 });
    const data = (await res.json()) as unknown;
    return NextResponse.json({ workflows: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "n8n request failed" }, { status: 502 });
  } finally {
    clearTimeout(t);
  }
}
