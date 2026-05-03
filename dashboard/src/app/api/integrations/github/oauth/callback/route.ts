import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken, tokenHint } from "@/lib/token-crypto";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fail = (msg: string) =>
    NextResponse.redirect(`${appUrl}/sources?error=${encodeURIComponent(msg)}`, { status: 302 });

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) return fail("Missing OAuth code or state");

  const jar = await cookies();
  const savedState = jar.get("torqa_gh_oauth_state")?.value;
  if (!savedState || savedState !== state) return fail("OAuth state mismatch — possible CSRF");

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("GitHub OAuth not configured on server");

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${appUrl}/api/integrations/github/oauth/callback`,
    }),
  });
  if (!tokenRes.ok) return fail("GitHub token exchange failed");

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenJson.access_token) {
    return fail(tokenJson.error_description ?? tokenJson.error ?? "No access token returned");
  }

  const accessToken = tokenJson.access_token;

  // Auth check
  const supabase = await createClient();
  if (!supabase) return fail("Supabase not configured");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Session expired — please log in again");

  const admin = createAdminClient();
  if (!admin) return fail("Server config error");

  let encryptedToken: string;
  try {
    encryptedToken = encryptToken(accessToken);
  } catch {
    return fail("Token encryption failed — TORQA_TOKEN_ENCRYPTION_KEY may be misconfigured");
  }

  // Upsert provider_token
  const { data: tokenRow, error: tokenErr } = await admin
    .from("provider_tokens")
    .insert({
      user_id: user.id,
      provider: "github",
      token_type: "access_token",
      token_hint: tokenHint(accessToken),
      encrypted_token: encryptedToken,
    })
    .select("id")
    .single();

  if (tokenErr || !tokenRow) return fail("Failed to store token");

  // Upsert integration row — update existing github row or insert new one
  const { data: existing } = await admin
    .from("integrations")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .is("organization_id", null)
    .maybeSingle();

  if (existing) {
    await admin
      .from("integrations")
      .update({
        status: "connected",
        auth_type: "oauth",
        token_id: tokenRow.id,
        config: { authMethod: "oauth", tokenHint: tokenHint(accessToken) },
      })
      .eq("id", existing.id);
  } else {
    await admin
      .from("integrations")
      .insert({
        user_id: user.id,
        organization_id: null,
        provider: "github",
        name: "GitHub",
        status: "connected",
        auth_type: "oauth",
        token_id: tokenRow.id,
        config: { authMethod: "oauth", tokenHint: tokenHint(accessToken) },
      });
  }

  // Clear state cookie
  const response = NextResponse.redirect(`${appUrl}/sources?connected=github`, { status: 302 });
  response.cookies.set("torqa_gh_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
