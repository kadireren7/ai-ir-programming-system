import type { Connector } from "./types";

export const zapierConnector: Connector = {
  id: "zapier",
  name: "Zapier",
  description: "Scan Zap orchestrations for governance violations. Connect via API key to fetch and analyze your Zaps.",
  status: "available",
  authType: "apikey",
  credentialFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "Paste your Zapier API key",
      required: true,
      hint: "Zapier Settings → Developer API → Personal Access Token.",
    },
  ],
  capabilities: ["scan_workflow"],
  docsUrl: "https://zapier.com/developer",
};

export const makeConnector: Connector = {
  id: "make",
  name: "Make",
  description: "Scenario-level governance for Make (formerly Integromat). Scan scenarios for credential leaks and risky operations.",
  status: "available",
  authType: "apikey",
  credentialFields: [
    {
      key: "apiKey",
      label: "API Token",
      type: "password",
      placeholder: "Paste your Make API token",
      required: true,
      hint: "Make → Profile → API → Generate token.",
    },
    {
      key: "teamId",
      label: "Team ID",
      type: "text",
      placeholder: "e.g. 123456",
      required: false,
      hint: "Found in your Make team URL. Leave blank for personal account.",
    },
  ],
  capabilities: ["scan_workflow"],
  docsUrl: "https://www.make.com/en/api-documentation",
};

export const pipedreamConnector: Connector = {
  id: "pipedream",
  name: "Pipedream",
  description: "Connect Pipedream workflows for continuous risk monitoring.",
  status: "coming_soon",
  authType: "apikey",
  credentialFields: [],
  capabilities: ["scan_workflow"],
  docsUrl: "https://pipedream.com/docs/api/",
};

export const aiAgentConnector: Connector = {
  id: "ai-agent",
  name: "AI Agent",
  description: "Govern AI agent definitions and LLM pipelines. Upload an agent JSON definition to scan for prompt injection, dangerous tools, and scope violations.",
  status: "available",
  authType: "none",
  credentialFields: [],
  capabilities: ["scan_workflow", "upload_definition"],
};
