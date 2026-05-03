export type IntegrationProvider = "n8n" | "github" | "zapier" | "make" | "pipedream" | "webhook" | "ai-agent";
export type IntegrationStatus = "draft" | "connected" | "error" | "paused";

export function isIntegrationProvider(v: unknown): v is IntegrationProvider {
  return (
    v === "n8n" || v === "github" || v === "zapier" || v === "make" ||
    v === "pipedream" || v === "webhook" || v === "ai-agent"
  );
}

export function isIntegrationStatus(v: unknown): v is IntegrationStatus {
  return v === "draft" || v === "connected" || v === "error" || v === "paused";
}

export function sanitizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return trimmed.replace(/\/+$/, "");
}

export function maskSecret(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const last = trimmed.slice(-4);
  return `••••${last}`;
}

export function toIntegrationApi(
  row: Record<string, unknown>
): {
  id: string;
  userId: string;
  organizationId: string | null;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
} | null {
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.name !== "string" ||
    !isIntegrationProvider(row.provider) ||
    !isIntegrationStatus(row.status) ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: typeof row.organization_id === "string" ? row.organization_id : null,
    provider: row.provider,
    name: row.name,
    status: row.status,
    config:
      row.config && typeof row.config === "object" && !Array.isArray(row.config)
        ? (row.config as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
