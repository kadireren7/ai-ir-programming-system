"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Shield, CheckCircle2, Loader2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hasPublicSupabaseUrl } from "@/lib/env";

const useCloud = hasPublicSupabaseUrl();

type SsoConfig = {
  id: string;
  providerType: string;
  clientId: string;
  issuerUrl: string;
  domainRestriction: string | null;
  enabled: boolean;
  createdAt: string;
};

type ProviderType = "google_workspace" | "entra_id" | "oidc";

const PROVIDER_LABELS: Record<ProviderType, string> = {
  google_workspace: "Google Workspace",
  entra_id: "Microsoft Entra ID",
  oidc: "Generic OIDC / OAuth2",
};

const PROVIDER_ISSUER_HINTS: Record<ProviderType, string> = {
  google_workspace: "https://accounts.google.com",
  entra_id: "https://login.microsoftonline.com/{tenant-id}/v2.0",
  oidc: "https://your-idp.example.com",
};

export default function SSOPage() {
  const [config, setConfig] = useState<SsoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState<ProviderType>("google_workspace");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [issuerUrl, setIssuerUrl] = useState("");
  const [domain, setDomain] = useState("");

  const load = useCallback(async () => {
    if (!useCloud) { setLoading(false); return; }
    try {
      const res = await fetch("/api/settings/sso", { credentials: "include" });
      const j = (await res.json()) as { config?: SsoConfig | null; error?: string };
      if (res.ok && j.config) {
        setConfig(j.config);
        setProvider(j.config.providerType as ProviderType);
        setClientId(j.config.clientId);
        setIssuerUrl(j.config.issuerUrl);
        setDomain(j.config.domainRestriction ?? "");
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleProviderChange = (p: ProviderType) => {
    setProvider(p);
    setIssuerUrl(PROVIDER_ISSUER_HINTS[p]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/sso", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: provider,
          clientId,
          clientSecret,
          issuerUrl,
          domainRestriction: domain.trim() || null,
          enabled: true,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) { setError(j.error ?? "Save failed"); return; }
      setSaved(true);
      await load();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Remove SSO configuration? Users will no longer be able to sign in via SSO.")) return;
    setDeleting(true);
    try {
      await fetch("/api/settings/sso", { method: "DELETE", credentials: "include" });
      setConfig(null);
      setClientId("");
      setClientSecret("");
      setIssuerUrl("");
      setDomain("");
    } catch { /* */ }
    finally { setDeleting(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">SSO / Identity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Single sign-on lets your team authenticate via your corporate identity provider.
        </p>
      </div>

      {!useCloud ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-5">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200/80">
              Cloud mode required for SSO. Connect Supabase to enable identity federation.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <>
          {config ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">SSO configured</p>
                    <p className="text-xs text-muted-foreground">
                      {PROVIDER_LABELS[config.providerType as ProviderType] ?? config.providerType}
                      {config.domainRestriction ? ` · @${config.domainRestriction}` : ""}
                    </p>
                  </div>
                </div>
                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  {config.enabled ? "Active" : "Disabled"}
                </Badge>
              </CardContent>
            </Card>
          ) : null}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          {saved && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400">SSO configuration saved.</p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" />
                Identity Provider Configuration
              </CardTitle>
              <CardDescription>Configure OIDC/SAML credentials for your organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Provider</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(PROVIDER_LABELS) as [ProviderType, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleProviderChange(key)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        provider === key
                          ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                          : "border-border/50 bg-muted/10 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Issuer URL</Label>
                <p className="text-xs text-muted-foreground">OIDC discovery issuer. Used to build the authorize and token endpoints.</p>
                <Input
                  value={issuerUrl}
                  onChange={(e) => setIssuerUrl(e.target.value)}
                  placeholder={PROVIDER_ISSUER_HINTS[provider]}
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client ID</Label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. 1234567890-abc...apps.googleusercontent.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client Secret</Label>
                <p className="text-xs text-muted-foreground">Stored encrypted server-side. Leave blank to keep existing secret when updating.</p>
                <Input
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={config ? "••••••••• (enter to replace)" : "Paste client secret"}
                  type="password"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Domain restriction (optional)</Label>
                <p className="text-xs text-muted-foreground">Only allow users from this email domain. e.g. <code className="text-cyan-400">company.com</code></p>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="company.com"
                />
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/10 px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Callback / Redirect URI</p>
                <p className="text-xs font-mono text-foreground">
                  {process.env.NEXT_PUBLIC_APP_URL ?? "https://app.torqa.dev"}/api/auth/sso/oidc/callback
                </p>
                <p className="text-xs text-muted-foreground">Add this to your IdP as an allowed redirect URI.</p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={saving || !clientId || !issuerUrl || (!clientSecret && !config)}
                  onClick={() => void handleSave()}
                  className="gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {config ? "Update configuration" : "Save configuration"}
                </Button>
                {config && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {config && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Test SSO Login</CardTitle>
                <CardDescription className="text-xs">
                  Use the link below to test your SSO configuration with a real identity provider login.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={`/api/auth/sso/oidc/start?orgId=current`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Test SSO sign-in ↗
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">← Back to Settings</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/workspace">Workspace & Team</Link>
        </Button>
      </div>
    </div>
  );
}
