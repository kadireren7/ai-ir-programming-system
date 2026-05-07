import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken, tokenHint } from "@/lib/token-crypto";
import { syncIntegration } from "@/lib/workflow-sync-engine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fail = (msg: string) =>
    NextResponse.redirect(`${appUrl}/sources?error=${encodeURIComponent(msg)}`, { status: 302 });

  const url = new URL(request.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) return fail("Missing OAuth code or state");

  const jar = await cookies();
  const savedState = jar.get("torqa_zapier_oauth_state")?.value;
  if (!savedState || savedState !== state) return fail("OAuth state mismatch — possible CSRF");

  const clientId     = process.env.ZAPIER_OAUTH_CLIENT_ID;
  const clientSecret = process.env.ZAPIER_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("Zapier OAuth not configured on server");

  // Exchange code → token
  const tokenRes = await fetch("https://zapier.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${appUrl}/api/integrations/zapier/oauth/callback`,
    }),
  }).catch(() => null);

  if (!tokenRes || !tokenRes.ok) return fail("Zapier token exchange failed");

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenJson.access_token) {
    return fail(tokenJson.error_description ?? tokenJson.error ?? "No access token returned");
  }

  const supabase = await createClient();
  if (!supabase) return fail("Supabase not configured");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Session expired — please log in again");

  const admin = createAdminClient();
  if (!admin) return fail("Server config error");

  let encryptedToken: string;
  try { encryptedToken = encryptToken(tokenJson.access_token); } catch {
    return fail("Token encryption failed");
  }

  const hint = tokenHint(tokenJson.access_token);

  const { data: tokenRow, error: tokenErr } = await admin
    .from("provider_tokens")
    .insert({ user_id: user.id, provider: "zapier", token_type: "access_token", token_hint: hint, encrypted_token: encryptedToken })
    .select("id").single();

  if (tokenErr || !tokenRow) return fail("Failed to store token");

  const { data: existing } = await admin
    .from("integrations").select("id")
    .eq("user_id", user.id).eq("provider", "zapier").is("organization_id", null).maybeSingle();

  const payload = { status: "connected" as const, auth_type: "oauth" as const, token_id: tokenRow.id, config: { authMethod: "oauth", tokenHint: hint } };

  let integrationId: string;
  if (existing) {
    await admin.from("integrations").update(payload).eq("id", existing.id);
    integrationId = existing.id;
  } else {
    const { data: newInt } = await admin
      .from("integrations")
      .insert({ user_id: user.id, organization_id: null, provider: "zapier", name: "Zapier", ...payload })
      .select("id").single();
    integrationId = newInt?.id ?? "";
  }

  if (integrationId) {
    void syncIntegration(user.id, integrationId).catch(() => {});
  }

  const res = NextResponse.redirect(`${appUrl}/sources?connected=zapier`, { status: 302 });
  res.cookies.set("torqa_zapier_oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
