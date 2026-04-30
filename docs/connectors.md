# Connectors

Torqa uses a connector abstraction to integrate with automation platforms.

## Registry

`dashboard/src/lib/connectors/registry.ts` — central list of all connectors.

Each connector implements the `Connector` interface from `types.ts`:

```ts
type Connector = {
  id: string;
  name: string;
  status: "available" | "beta" | "coming_soon";
  credentialFields: CredentialField[];
  capabilities: ConnectorCapability[];
  testConnection?: (creds) => Promise<{ ok: boolean; error?: string }>;
  listWorkflows?: (creds) => Promise<{ id: string; name: string }[]>;
  scanWorkflow?: (workflowId, creds) => Promise<Record<string, unknown>>;
};
```

## Available connectors

| ID | Status | Capabilities |
|----|--------|-------------|
| n8n | available | test_connection, list_workflows, scan_workflow, schedule |
| github | available | test_connection, pr_comments, webhook |
| webhook | available | scan_workflow, schedule |
| zapier | coming_soon | scan_workflow |
| make | coming_soon | scan_workflow |
| pipedream | coming_soon | scan_workflow |

## Credential handling

- Credentials are submitted to `/api/integrations` (POST/PATCH).
- Server stores `apiKeyMask` (first 4 chars + `***`) — full key never returned to client.
- UI shows masked hint only.
- GitHub webhook secret verified via `X-Hub-Signature-256`.

## Adding a connector

1. Create `dashboard/src/lib/connectors/<name>-connector.ts`
2. Export a `Connector` object
3. Import and add to `connectorRegistry` in `registry.ts`
4. Add icon mapping in `sources/page.tsx`
