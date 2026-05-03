import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/token-crypto";

export const runtime = "nodejs";

async function resolveGitHubToken(userId: string): Promise<{ token: string; owner?: string; repo?: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: integration } = await admin
    .from("integrations")
    .select("config,token_id")
    .eq("user_id", userId)
    .eq("provider", "github")
    .eq("status", "connected")
    .is("organization_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!integration?.token_id) return null;

  const cfg = integration.config && typeof integration.config === "object" && !Array.isArray(integration.config)
    ? (integration.config as Record<string, unknown>)
    : {};

  const { data: tokenRow } = await admin
    .from("provider_tokens")
    .select("encrypted_token")
    .eq("id", integration.token_id)
    .single();

  if (!tokenRow?.encrypted_token) return null;

  try {
    const token = decryptToken(tokenRow.encrypted_token);
    return {
      token,
      owner: typeof cfg.owner === "string" ? cfg.owner : undefined,
      repo: typeof cfg.repo === "string" ? cfg.repo : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchGitHubWorkflows(token: string, owner: string, repo: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 15_000);

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows`, {
      headers,
      signal: ac.signal,
    });

    if (res.status === 404) return { workflows: [], error: null };
    if (!res.ok) return { workflows: [], error: `GitHub API ${res.status}` };

    const files = (await res.json()) as unknown[];
    const yamlFiles = Array.isArray(files)
      ? files.filter((f): f is Record<string, unknown> =>
          f !== null && typeof f === "object" && !Array.isArray(f) &&
          typeof (f as Record<string, unknown>).name === "string" &&
          /\.(yml|yaml)$/.test((f as Record<string, unknown>).name as string)
        )
      : [];

    const workflows = await Promise.all(
      yamlFiles.map(async (file) => {
        const name = file.name as string;
        const downloadUrl = typeof file.download_url === "string" ? file.download_url : null;
        if (!downloadUrl) return null;

        try {
          const contentRes = await fetch(downloadUrl, { headers, signal: ac.signal });
          if (!contentRes.ok) return null;
          const yamlContent = await contentRes.text();
          return {
            id: `${owner}/${repo}/.github/workflows/${name}`,
            name: name.replace(/\.(yml|yaml)$/, ""),
            content: { yamlContent, fileName: name, owner, repo },
          };
        } catch {
          return null;
        }
      })
    );

    return {
      workflows: workflows.filter((w): w is NonNullable<typeof w> => w !== null),
      error: null,
    };
  } catch (e) {
    return { workflows: [], error: e instanceof Error ? e.message : "GitHub fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function getUserRepos(token: string): Promise<Array<{ owner: string; name: string }>> {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch("https://api.github.com/user/repos?per_page=30&sort=updated", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: ac.signal,
    });
    if (!res.ok) return [];
    const repos = (await res.json()) as unknown[];
    return Array.isArray(repos)
      ? repos
          .filter((r): r is Record<string, unknown> => r !== null && typeof r === "object")
          .map((r) => ({
            owner: typeof (r as Record<string, unknown>).owner === "object" && (r as Record<string, unknown>).owner !== null
              ? String(((r as Record<string, unknown>).owner as Record<string, unknown>).login ?? "")
              : "",
            name: typeof (r as Record<string, unknown>).name === "string" ? String((r as Record<string, unknown>).name) : "",
          }))
          .filter((r) => r.owner && r.name)
          .slice(0, 20)
      : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creds = await resolveGitHubToken(user.id);
  if (!creds) {
    return NextResponse.json({ error: "GitHub not connected. Connect via Sources." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner") ?? creds.owner ?? "";
  const repo  = searchParams.get("repo")  ?? creds.repo  ?? "";

  if (!owner || !repo) {
    const repos = await getUserRepos(creds.token);
    return NextResponse.json({ workflows: [], repos, needsRepo: true });
  }

  const { workflows, error } = await fetchGitHubWorkflows(creds.token, owner, repo);
  if (error) return NextResponse.json({ error }, { status: 502 });

  return NextResponse.json({ workflows, repos: [], needsRepo: false });
}
