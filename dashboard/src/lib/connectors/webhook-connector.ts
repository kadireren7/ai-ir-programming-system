import type { Connector } from "./types";

export const webhookConnector: Connector = {
  id: "webhook",
  name: "Generic Webhook / API",
  description: "Send workflow JSON to Torqa via POST. Works with any CI/CD system.",
  status: "available",
  credentialFields: [
    {
      key: "apiKey",
      label: "Torqa API Key",
      type: "password",
      placeholder: "torqa_…",
      required: true,
      hint: "Generate from Settings → API. Use as Bearer token.",
    },
  ],
  capabilities: ["scan_workflow", "schedule"],
  docsUrl: "/docs/api-quickstart.md",
};
