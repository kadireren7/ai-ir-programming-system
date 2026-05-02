export type ConnectorStatus = "available" | "beta" | "coming_soon";

export type ConnectorAuthType = "apikey" | "oauth" | "webhook" | "none";

export type CredentialField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  required: boolean;
  hint?: string;
};

export type ConnectorCapability =
  | "test_connection"
  | "list_workflows"
  | "scan_workflow"
  | "upload_definition"
  | "pr_comments"
  | "webhook"
  | "schedule";

export type Connector = {
  id: string;
  name: string;
  description: string;
  status: ConnectorStatus;
  authType: ConnectorAuthType;
  credentialFields: CredentialField[];
  capabilities: ConnectorCapability[];
  docsUrl?: string;
  testConnection?: (credentials: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;
  listWorkflows?: (credentials: Record<string, string>) => Promise<{ id: string; name: string }[]>;
  scanWorkflow?: (workflowId: string, credentials: Record<string, string>) => Promise<Record<string, unknown>>;
};
