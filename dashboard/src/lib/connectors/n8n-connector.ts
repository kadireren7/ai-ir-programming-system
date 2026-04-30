import type { Connector } from "./types";

export const n8nConnector: Connector = {
  id: "n8n",
  name: "n8n",
  description: "Connect your n8n instance to scan workflows and monitor governance continuously.",
  status: "available",
  credentialFields: [
    {
      key: "baseUrl",
      label: "Base URL",
      type: "url",
      placeholder: "https://n8n.company.com",
      required: true,
      hint: "Your n8n instance URL without trailing slash.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "Paste n8n API key",
      required: true,
      hint: "Settings → API in n8n. Only a masked hint is stored server-side.",
    },
  ],
  capabilities: ["test_connection", "list_workflows", "scan_workflow", "schedule"],
  docsUrl: "https://docs.n8n.io/api/",

  async testConnection(credentials) {
    try {
      const res = await fetch("/api/integrations/n8n/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: credentials.baseUrl, apiKey: credentials.apiKey }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      return { ok: j.ok ?? false, error: j.error };
    } catch {
      return { ok: false, error: "Network error" };
    }
  },

  async listWorkflows() {
    const res = await fetch("/api/integrations/n8n/workflows", { credentials: "include" });
    const j = (await res.json()) as { workflows?: { id: string; name: string }[]; error?: string };
    if (!res.ok) throw new Error(j.error ?? "Failed to list workflows");
    return j.workflows ?? [];
  },
};
