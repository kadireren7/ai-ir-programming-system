import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeOidcCode, provisionSsoUser } from "@/lib/oidc-sso";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fail = (msg: string) =>
    NextResponse.redirect(`${appUrl}/auth/login?error=${encodeURIComponent(msg)}`, { status: 302 });

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) return fail("Missing OAuth code or state");

  const jar = await cookies();
  const savedState = jar.get("torqa_sso_state")?.value;
  if (!savedState || savedState !== state) return fail("State mismatch — possible CSRF");

  const [orgId] = state.split(":");
  if (!orgId) return fail("Invalid state — missing orgId");

  const admin = createAdminClient();
  if (!admin) return fail("Server config error");

  const { data: ssoConfig } = await admin
    .from("sso_configs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("enabled", true)
    .maybeSingle();

  if (!ssoConfig) return fail("SSO not configured for this organization");

  const redirectUri = `${appUrl}/api/auth/sso/oidc/callback`;

  const userInfo = await exchangeOidcCode({
    issuerUrl: ssoConfig.issuer_url as string,
    clientId: ssoConfig.client_id as string,
    clientSecret: ssoConfig.client_secret as string,
    code,
    redirectUri,
  });

  if (!userInfo) return fail("Failed to verify identity with identity provider");

  // Domain restriction check
  if (ssoConfig.domain_restriction) {
    const domain = userInfo.email.split("@")[1]?.toLowerCase() ?? "";
    if (domain !== (ssoConfig.domain_restriction as string).toLowerCase()) {
      return fail(`Email domain "${domain}" is not allowed by this SSO configuration`);
    }
  }

  // Provision user session via magic link
  const provision = await provisionSsoUser(userInfo.email, userInfo.name);
  if (!provision) return fail("Failed to provision user account");

  // Clear state cookie
  const res = NextResponse.redirect(provision.magicLink, { status: 302 });
  res.cookies.set("torqa_sso_state", "", { maxAge: 0, path: "/" });
  return res;
}
