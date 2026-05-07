import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/token-crypto";

export type FetchedWorkflow = {
  id: string;
  name: string;
  content: Record<string, unknown>;
};

export type IntegrationFetchResult =
  | { ok: true; provider: string; integrationId: string; workflows: FetchedWorkflow[] }
  | { ok: false; error: string };

export async function fetchIntegrationWorkflows(integrationId: string): Promise<IntegrationFetchResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin client not configured" };

  const { data: row, error } = await admin
    .from("integrations")
    .select("id,provider,config,token_id,status")
    .eq("id", integrationId)
    .eq("status", "connected")
    .maybeSingle();

  if (error || !row) return { ok: false, error: "Integration not found or not connected" };

  const provider = typeof row.provider === "string" ? row.provider : "";

  if (provider === "n8n") {
    return fetchN8nWorkflows(integrationId, row as { config: unknown; token_id: unknown });
  }

  if (provider === "github") {
    return fetchGitHubWorkflows(integrationId, row as { config: unknown; token_id: unknown });
  }

  if (provider === "ai-agent") {
    return fetchAiAgentWorkflows(integrationId, row as { config: unknown });
  }

  if (provider === "zapier") {
    return fetchZapierWorkflows(integrationId, row as { config: unknown; token_id: unknown });
  }

  if (provider === "make") {
    return fetchMakeWorkflows(integrationId, row as { config: unknown; token_id: unknown });
  }

  if (provider === "pipedream") {
    return fetchPipedreamWorkflows(integrationId, row as { token_id: unknown });
  }

  return { ok: false, error: `Provider "${provider}" does not support scheduled workflow scanning yet` };
}

async function fetchN8nWorkflows(
  integrationId: string,
  row: { config: unknown; token_id: unknown }
): Promise<IntegrationFetchResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin client not configured" };

  const cfg =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};

  const baseUrl = typeof cfg.baseUrl === "string" ? cfg.baseUrl.replace(/\/+$/, "") : "";
  if (!baseUrl) return { ok: false, error: "n8n integration missing baseUrl" };

  let apiKey = "";
  if (typeof row.token_id === "string" && row.token_id) {
    const { data: tokenRow } = await admin
      .from("provider_tokens")
      .select("encrypted_token")
      .eq("id", row.token_id)
      .single();
    if (tokenRow?.encrypted_token) {
      try {
        apiKey = decryptToken(tokenRow.encrypted_token);
      } catch {
        /* decryption failed — fall through to env var */
      }
    }
  }

  if (!apiKey) {
    const envKey = process.env.N8N_API_KEY?.trim() ?? "";
    if (envKey) apiKey = envKey;
  }

  if (!apiKey) return { ok: false, error: "Could not resolve n8n API key" };

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetch(`${baseUrl}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return { ok: false, error: `n8n API responded with ${res.status}` };

    const data = (await res.json()) as unknown;
    // n8n v1 returns { data: [...] }, older versions return array directly
    const raw: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.data)
        ? ((data as Record<string, unknown>).data as unknown[])
        : [];

    const workflows: FetchedWorkflow[] = raw
      .filter((w): w is Record<string, unknown> => w !== null && typeof w === "object" && !Array.isArray(w))
      .map((w) => ({
        id: typeof w.id === "string" ? w.id : String(w.id ?? ""),
        name: typeof w.name === "string" && w.name.trim() ? w.name.trim() : "Unnamed workflow",
        content: w,
      }));

    return { ok: true, provider: "n8n", integrationId, workflows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "n8n fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGitHubWorkflows(
  integrationId: string,
  row: { config: unknown; token_id: unknown }
): Promise<IntegrationFetchResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin client not configured" };

  const cfg =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};

  const owner = typeof cfg.owner === "string" ? cfg.owner.trim() : "";
  const repo = typeof cfg.repo === "string" ? cfg.repo.trim() : "";

  if (!owner || !repo) {
    return { ok: false, error: "GitHub integration missing owner/repo config. Edit the integration to add repo details." };
  }

  let token = "";
  if (typeof row.token_id === "string" && row.token_id) {
    const { data: tokenRow } = await admin
      .from("provider_tokens")
      .select("encrypted_token")
      .eq("id", row.token_id)
      .single();
    if (tokenRow?.encrypted_token) {
      try { token = decryptToken(tokenRow.encrypted_token); } catch { /* fall through */ }
    }
  }

  if (!token) return { ok: false, error: "Could not resolve GitHub token" };

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 20_000);
  try {
    const listRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows`,
      { headers, signal: ac.signal }
    );
    if (listRes.status === 404) return { ok: true, provider: "github", integrationId, workflows: [] };
    if (!listRes.ok) return { ok: false, error: `GitHub API ${listRes.status}` };

    const files = (await listRes.json()) as unknown[];
    const yamlFiles = Array.isArray(files)
      ? files.filter(
          (f): f is Record<string, unknown> =>
            f !== null && typeof f === "object" && !Array.isArray(f) &&
            typeof (f as Record<string, unknown>).name === "string" &&
            /\.(yml|yaml)$/.test((f as Record<string, unknown>).name as string)
        )
      : [];

    const workflows: FetchedWorkflow[] = [];
    for (const file of yamlFiles) {
      const name = file.name as string;
      const downloadUrl = typeof file.download_url === "string" ? file.download_url : null;
      if (!downloadUrl) continue;
      try {
        const contentRes = await fetch(downloadUrl, { headers, signal: ac.signal });
        if (!contentRes.ok) continue;
        const yamlContent = await contentRes.text();
        workflows.push({
          id: `${owner}/${repo}/.github/workflows/${name}`,
          name: name.replace(/\.(yml|yaml)$/, ""),
          content: { yamlContent, fileName: name, owner, repo },
        });
      } catch { /* skip this file */ }
    }

    return { ok: true, provider: "github", integrationId, workflows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "GitHub fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
}

function fetchAiAgentWorkflows(
  integrationId: string,
  row: { config: unknown }
): IntegrationFetchResult {
  const cfg =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};

  const agents = Array.isArray(cfg.agents) ? cfg.agents : [cfg];

  const workflows: FetchedWorkflow[] = agents
    .filter((a): a is Record<string, unknown> => a !== null && typeof a === "object" && !Array.isArray(a))
    .map((agent, idx) => ({
      id: typeof agent.id === "string" ? agent.id : `agent-${idx}`,
      name: typeof agent.name === "string" && agent.name.trim() ? agent.name.trim() : `AI Agent ${idx + 1}`,
      content: agent,
    }));

  return { ok: true, provider: "ai-agent", integrationId, workflows };
}

async function fetchZapierWorkflows(
  integrationId: string,
  row: { config: unknown; token_id: unknown }
): Promise<IntegrationFetchResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin client not configured" };

  let apiKey = "";
  if (typeof row.token_id === "string" && row.token_id) {
    const { data: tokenRow } = await admin
      .from("provider_tokens").select("encrypted_token").eq("id", row.token_id).single();
    if (tokenRow?.encrypted_token) {
      try { apiKey = decryptToken(tokenRow.encrypted_token); } catch { /* */ }
    }
  }
  if (!apiKey) return { ok: false, error: "Could not resolve Zapier API key" };

  const cfg = row.config && typeof row.config === "object" && !Array.isArray(row.config)
    ? (row.config as Record<string, unknown>) : {};
  const authMethod = typeof cfg.authMethod === "string" ? cfg.authMethod : "apikey";

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 15_000);
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (authMethod === "oauth") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["X-API-Key"] = apiKey;
    }
    const res = await fetch("https://api.zapier.com/v1/zaps?limit=100&status=on", {
      headers,
      signal: ac.signal,
    });
    if (!res.ok) return { ok: false, error: `Zapier API ${res.status}` };
    const data = (await res.json()) as { results?: unknown[] };
    const raw = data.results ?? [];
    const workflows: FetchedWorkflow[] = raw
      .filter((z): z is Record<string, unknown> => z !== null && typeof z === "object" && !Array.isArray(z))
      .map((z) => ({
        id: typeof z.id === "string" ? z.id : String(z.id ?? ""),
        name: typeof z.title === "string" && z.title.trim() ? z.title.trim() : "Unnamed Zap",
        content: z,
      }));
    return { ok: true, provider: "zapier", integrationId, workflows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Zapier fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchMakeWorkflows(
  integrationId: string,
  row: { config: unknown; token_id: unknown }
): Promise<IntegrationFetchResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin client not configured" };

  const cfg = row.config && typeof row.config === "object" && !Array.isArray(row.config)
    ? (row.config as Record<string, unknown>) : {};
  const zone = typeof cfg.zone === "string" ? cfg.zone : "eu1";
  const teamId = typeof cfg.teamId === "string" ? cfg.teamId : null;
  const domain = `https://${zone}.make.com`;

  let apiKey = "";
  if (typeof row.token_id === "string" && row.token_id) {
    const { data: tokenRow } = await admin
      .from("provider_tokens").select("encrypted_token").eq("id", row.token_id).single();
    if (tokenRow?.encrypted_token) {
      try { apiKey = decryptToken(tokenRow.encrypted_token); } catch { /* */ }
    }
  }
  if (!apiKey) return { ok: false, error: "Could not resolve Make API key" };

  const scenariosUrl = teamId
    ? `${domain}/api/v2/scenarios?teamId=${teamId}&pg%5Blimit%5D=100`
    : `${domain}/api/v2/scenarios?pg%5Blimit%5D=100`;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetch(scenariosUrl, {
      headers: { Authorization: `Token ${apiKey}`, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return { ok: false, error: `Make API ${res.status}` };
    const data = (await res.json()) as { scenarios?: unknown[] };
    const raw = data.scenarios ?? [];
    const workflows: FetchedWorkflow[] = raw
      .filter((s): s is Record<string, unknown> => s !== null && typeof s === "object" && !Array.isArray(s))
      .map((s) => ({
        id: typeof s.id === "string" ? s.id : String(s.id ?? ""),
        name: typeof s.name === "string" && s.name.trim() ? s.name.trim() : "Unnamed Scenario",
        content: s,
      }));
    return { ok: true, provider: "make", integrationId, workflows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Make fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPipedreamWorkflows(
  integrationId: string,
  row: { token_id: unknown }
): Promise<IntegrationFetchResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin client not configured" };

  let apiKey = "";
  if (typeof row.token_id === "string" && row.token_id) {
    const { data: tokenRow } = await admin
      .from("provider_tokens").select("encrypted_token").eq("id", row.token_id).single();
    if (tokenRow?.encrypted_token) {
      try { apiKey = decryptToken(tokenRow.encrypted_token); } catch { /* */ }
    }
  }
  if (!apiKey) return { ok: false, error: "Could not resolve Pipedream API key" };

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetch("https://api.pipedream.com/v1/users/me/workflows?limit=100", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) return { ok: false, error: `Pipedream API ${res.status}` };
    const data = (await res.json()) as { data?: unknown[] };
    const raw = data.data ?? [];
    const workflows: FetchedWorkflow[] = raw
      .filter((w): w is Record<string, unknown> => w !== null && typeof w === "object" && !Array.isArray(w))
      .map((w) => ({
        id: typeof w.id === "string" ? w.id : String(w.id ?? ""),
        name: typeof w.name === "string" && w.name.trim() ? w.name.trim() : "Unnamed Workflow",
        content: w,
      }));
    return { ok: true, provider: "pipedream", integrationId, workflows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Pipedream fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
}
