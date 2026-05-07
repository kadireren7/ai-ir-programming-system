import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildOidcAuthUrl } from "@/lib/oidc-sso";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fail = (msg: string) =>
    NextResponse.redirect(`${appUrl}/auth/login?error=${encodeURIComponent(msg)}`, { status: 302 });

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");

  if (!orgId) return fail("Missing orgId parameter");

  const admin = createAdminClient();
  if (!admin) return fail("Server config error");

  const { data: ssoConfig } = await admin
    .from("sso_configs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("enabled", true)
    .maybeSingle();

  if (!ssoConfig) return fail("SSO not configured for this organization");

  const state = randomBytes(24).toString("hex");
  const redirectUri = `${appUrl}/api/auth/sso/oidc/callback`;

  const authUrl = buildOidcAuthUrl({
    issuerUrl: ssoConfig.issuer_url as string,
    clientId: ssoConfig.client_id as string,
    redirectUri,
    state: `${orgId}:${state}`,
    domainRestriction: ssoConfig.domain_restriction as string | null,
  });

  const jar = await cookies();
  jar.set("torqa_sso_state", `${orgId}:${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(authUrl, { status: 302 });
}
