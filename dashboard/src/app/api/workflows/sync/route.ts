import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlainObject } from "@/lib/json-guards";
import { decryptToken } from "@/lib/token-crypto";

export const runtime = "nodejs";

type SyncResult = { added: number; updated: number; unchanged: number };

async function syncN8n(
  userId: string,
  integrationId: string,
  baseUrl: string,
  apiKey: string
): Promise<SyncResult> {
  const admin = createAdminClient()!;

  // Fetch workflow list from n8n
  const listRes = await fetch(`${baseUrl}/api/v1/workflows?limit=250`, {
    headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!listRes.ok) throw new Error(`n8n list workflows failed: HTTP ${listRes.status}`);

  const listJson = (await listRes.json()) as { data?: unknown[]; [k: string]: unknown };
  const workflows: unknown[] = Array.isArray(listJson.data) ? listJson.data : [];

  const result: SyncResult = { added: 0, updated: 0, unchanged: 0 };

  for (const wf of workflows) {
    if (!isPlainObject(wf)) continue;
    const externalId = String(wf.id ?? "");
    const name       = typeof wf.name === "string" ? wf.name : "Untitled";
    if (!externalId) continue;

    // Fetch full workflow content
    let content: Record<string, unknown> = wf;
    try {
      const detailRes = await fetch(`${baseUrl}/api/v1/workflows/${externalId}`, {
        headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (detailRes.ok) {
        const detail = (await detailRes.json()) as unknown;
        if (isPlainObject(detail)) content = detail;
      }
    } catch {
      // use summary if detail fetch fails
    }

    // Check existing row
    const { data: existing } = await admin
      .from("workflow_templates")
      .select("id, updated_at")
      .eq("user_id", userId)
      .eq("source_id", integrationId)
      .eq("external_id", externalId)
      .maybeSingle();

    const updatedAt = typeof wf.updatedAt === "string" ? wf.updatedAt : null;

    if (existing) {
      const remoteNewer = updatedAt && existing.updated_at && updatedAt > existing.updated_at;
      if (remoteNewer) {
        await admin
          .from("workflow_templates")
          .update({ name, content, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        result.updated++;
      } else {
        await admin
          .from("workflow_templates")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", existing.id);
        result.unchanged++;
      }
    } else {
      await admin.from("workflow_templates").insert({
        user_id: userId,
        source_id: integrationId,
        external_id: externalId,
        source: "n8n",
        name,
        content,
        last_synced_at: new Date().toISOString(),
      });
      result.added++;
    }
  }

  return result;
}

type GhContentsItem = {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir" | "symlink" | "submodule";
  content?: string;
  encoding?: string;
};

async function ghFetch<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

const WORKFLOW_PATHS = ["workflows", ".n8n", "automation", ".torqa"];
const MAX_REPOS = 20;
const MAX_FILES = 50;

function looksLikeWorkflow(parsed: Record<string, unknown>): boolean {
  return (
    Array.isArray(parsed.nodes) ||
    Array.isArray(parsed.steps) ||
    (isPlainObject(parsed.definition) && Array.isArray((parsed.definition as Record<string, unknown>).nodes))
  );
}

async function syncGitHub(
  userId: string,
  integrationId: string,
  _config: Record<string, unknown>,
  token: string
): Promise<SyncResult> {
  const admin = createAdminClient()!;
  const result: SyncResult = { added: 0, updated: 0, unchanged: 0 };

  type GhRepo = { full_name: string; archived: boolean };
  const repos = await ghFetch<GhRepo[]>(
    `https://api.github.com/user/repos?per_page=${MAX_REPOS}&sort=updated&affiliation=owner,collaborator`,
    token
  );
  if (!repos || !Array.isArray(repos)) throw new Error("GitHub API: could not list repositories");

  let totalFiles = 0;

  for (const repo of repos) {
    if (repo.archived) continue;
    if (totalFiles >= MAX_FILES) break;

    for (const dirPath of WORKFLOW_PATHS) {
      if (totalFiles >= MAX_FILES) break;

      const items = await ghFetch<GhContentsItem[]>(
        `https://api.github.com/repos/${repo.full_name}/contents/${dirPath}`,
        token
      );
      if (!items || !Array.isArray(items)) continue;

      for (const item of items) {
        if (totalFiles >= MAX_FILES) break;
        if (item.type !== "file" || !item.name.endsWith(".json")) continue;

        // Fetch file content via Contents API (returns base64-encoded body)
        const fileData = await ghFetch<GhContentsItem>(
          `https://api.github.com/repos/${repo.full_name}/contents/${item.path}`,
          token
        );
        if (!fileData || fileData.encoding !== "base64" || !fileData.content) continue;

        let parsed: unknown;
        try {
          const raw = Buffer.from(fileData.content.replace(/\s/g, ""), "base64").toString("utf8");
          parsed = JSON.parse(raw);
        } catch { continue; }

        if (!isPlainObject(parsed) || !looksLikeWorkflow(parsed)) continue;

        totalFiles++;
        const externalId = `${repo.full_name}/${item.path}`;
        const name = typeof parsed.name === "string" ? parsed.name : item.name.replace(/\.json$/, "");

        const { data: existing } = await admin
          .from("workflow_templates")
          .select("id")
          .eq("user_id", userId)
          .eq("source_id", integrationId)
          .eq("external_id", externalId)
          .maybeSingle();

        if (existing) {
          await admin
            .from("workflow_templates")
            .update({
              name,
              content: parsed,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          result.updated++;
        } else {
          await admin.from("workflow_templates").insert({
            user_id: userId,
            source_id: integrationId,
            external_id: externalId,
            source: "github",
            name,
            content: parsed,
            last_synced_at: new Date().toISOString(),
          });
          result.added++;
        }
      }
    }
  }

  return result;
}

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

  const integrationId = typeof body.integrationId === "string" ? body.integrationId : "";
  if (!integrationId) return NextResponse.json({ error: "integrationId is required" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  // Load integration
  const { data: integration, error: intErr } = await admin
    .from("integrations")
    .select("id, provider, status, config, token_id, auth_type")
    .eq("id", integrationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (intErr || !integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  if (integration.status !== "connected") {
    return NextResponse.json({ error: "Integration is not connected" }, { status: 400 });
  }

  let syncResult: SyncResult;
  let syncStatus: "success" | "error" | "partial" = "success";
  let errorMessage: string | undefined;

  try {
    if (integration.provider === "n8n") {
      const cfg = isPlainObject(integration.config) ? integration.config : {};
      const baseUrl = typeof cfg.baseUrl === "string" ? cfg.baseUrl : "";
      if (!baseUrl) throw new Error("n8n base URL not configured");

      // Resolve API key: DB token first, env var fallback
      let apiKey = "";
      if (integration.token_id) {
        const { data: tokenRow } = await admin
          .from("provider_tokens")
          .select("encrypted_token")
          .eq("id", integration.token_id)
          .single();
        if (tokenRow?.encrypted_token) {
          apiKey = decryptToken(tokenRow.encrypted_token);
        }
      }
      if (!apiKey) {
        apiKey = process.env.N8N_API_KEY?.trim() ?? "";
      }
      if (!apiKey) throw new Error("n8n API key not available");

      syncResult = await syncN8n(user.id, integrationId, baseUrl, apiKey);
    } else if (integration.provider === "github") {
      const cfg = isPlainObject(integration.config) ? integration.config : {};

      // Resolve GitHub OAuth token: DB first, env var fallback
      let ghToken = "";
      if (integration.token_id) {
        const { data: tokenRow } = await admin
          .from("provider_tokens")
          .select("encrypted_token")
          .eq("id", integration.token_id)
          .single();
        if (tokenRow?.encrypted_token) {
          ghToken = decryptToken(tokenRow.encrypted_token);
        }
      }
      if (!ghToken) ghToken = process.env.GITHUB_BOT_TOKEN?.trim() ?? "";
      if (!ghToken) throw new Error("GitHub token not available — please reconnect your GitHub account");

      syncResult = await syncGitHub(user.id, integrationId, cfg, ghToken);
    } else {
      throw new Error(`Sync not supported for provider: ${integration.provider}`);
    }
  } catch (e) {
    syncStatus = "error";
    errorMessage = e instanceof Error ? e.message : "Sync failed";
    syncResult = { added: 0, updated: 0, unchanged: 0 };
  }

  // Write sync log
  await admin.from("sync_logs").insert({
    user_id: user.id,
    integration_id: integrationId,
    status: syncStatus,
    added: syncResult.added,
    updated: syncResult.updated,
    unchanged: syncResult.unchanged,
    error_message: errorMessage ?? null,
  });

  // Update integration last_synced_at in config
  await admin
    .from("integrations")
    .update({ config: { ...(isPlainObject(integration.config) ? integration.config : {}), last_synced_at: new Date().toISOString() } })
    .eq("id", integrationId);

  if (syncStatus === "error") {
    return NextResponse.json({ error: errorMessage, ...syncResult }, { status: 422 });
  }

  return NextResponse.json({ ok: true, ...syncResult });
}
