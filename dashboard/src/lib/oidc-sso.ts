import { createAdminClient } from "@/lib/supabase/admin";

export type SsoProviderType = "google_workspace" | "entra_id" | "oidc";

export type SsoConfig = {
  id: string;
  organizationId: string;
  providerType: SsoProviderType;
  clientId: string;
  issuerUrl: string;
  domainRestriction: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const PROVIDER_ISSUER_DEFAULTS: Record<SsoProviderType, string | null> = {
  google_workspace: "https://accounts.google.com",
  entra_id: null,
  oidc: null,
};

export function getDefaultIssuer(provider: SsoProviderType): string | null {
  return PROVIDER_ISSUER_DEFAULTS[provider];
}

export function buildOidcAuthUrl(opts: {
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  domainRestriction?: string | null;
}): string {
  const base = opts.issuerUrl.replace(/\/$/, "");
  const authorizeUrl = new URL(`${base}/authorize`);

  // Google uses different base URL
  if (opts.issuerUrl.includes("accounts.google.com")) {
    authorizeUrl.href = "https://accounts.google.com/o/oauth2/v2/auth";
  }

  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", opts.clientId);
  authorizeUrl.searchParams.set("redirect_uri", opts.redirectUri);
  authorizeUrl.searchParams.set("state", opts.state);
  authorizeUrl.searchParams.set("scope", "openid email profile");

  if (opts.domainRestriction && opts.issuerUrl.includes("accounts.google.com")) {
    authorizeUrl.searchParams.set("hd", opts.domainRestriction);
  }

  return authorizeUrl.toString();
}

export async function exchangeOidcCode(opts: {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{ email: string; name?: string; sub: string } | null> {
  const base = opts.issuerUrl.replace(/\/$/, "");
  let tokenUrl = `${base}/token`;
  if (opts.issuerUrl.includes("accounts.google.com")) {
    tokenUrl = "https://oauth2.googleapis.com/token";
  } else if (opts.issuerUrl.includes("login.microsoftonline.com")) {
    tokenUrl = `${base}/oauth2/v2.0/token`;
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10_000);

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        code: opts.code,
        redirect_uri: opts.redirectUri,
      }),
      signal: ac.signal,
    });
    if (!res.ok) return null;

    const tokenData = (await res.json()) as {
      id_token?: string;
      access_token?: string;
    };

    // Parse JWT id_token (base64 payload — no signature verification needed for claim extraction;
    // the token was just issued by the IdP in exchange for a valid code)
    if (tokenData.id_token) {
      const [, payloadB64] = tokenData.id_token.split(".");
      if (payloadB64) {
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as Record<string, unknown>;
        const email = typeof payload.email === "string" ? payload.email : null;
        const sub = typeof payload.sub === "string" ? payload.sub : "";
        const name = typeof payload.name === "string" ? payload.name : undefined;
        if (email) return { email, sub, name };
      }
    }

    // Fallback: use userinfo endpoint with access_token
    if (tokenData.access_token) {
      let userinfoUrl = `${base}/userinfo`;
      if (opts.issuerUrl.includes("accounts.google.com")) {
        userinfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo";
      }
      const uiRes = await fetch(userinfoUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (uiRes.ok) {
        const ui = (await uiRes.json()) as Record<string, unknown>;
        const email = typeof ui.email === "string" ? ui.email : null;
        const sub = typeof ui.sub === "string" ? ui.sub : "";
        const name = typeof ui.name === "string" ? ui.name : undefined;
        if (email) return { email, sub, name };
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getSsoConfigForOrg(orgId: string): Promise<SsoConfig | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("sso_configs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("enabled", true)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    providerType: data.provider_type as SsoProviderType,
    clientId: data.client_id as string,
    issuerUrl: data.issuer_url as string,
    domainRestriction: typeof data.domain_restriction === "string" ? data.domain_restriction : null,
    enabled: data.enabled as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function provisionSsoUser(email: string, name?: string): Promise<{ userId: string; magicLink: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    // Create or get existing user
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${appUrl}/`,
        data: name ? { full_name: name } : undefined,
      },
    });

    if (error || !linkData?.properties?.action_link) return null;

    const actionLink = linkData.properties.action_link as string;
    const userId = (linkData.user?.id as string) ?? "";

    return { userId, magicLink: actionLink };
  } catch {
    return null;
  }
}
