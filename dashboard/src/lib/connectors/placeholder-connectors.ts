import type { Connector } from "./types";

export const zapierConnector: Connector = {
  id: "zapier",
  name: "Zapier",
  description: "Scan Zap orchestrations for governance violations.",
  status: "coming_soon",
  credentialFields: [],
  capabilities: ["scan_workflow"],
  docsUrl: "https://zapier.com/developer",
};

export const makeConnector: Connector = {
  id: "make",
  name: "Make",
  description: "Scenario-level governance for Make (formerly Integromat) workflows.",
  status: "coming_soon",
  credentialFields: [],
  capabilities: ["scan_workflow"],
  docsUrl: "https://www.make.com/en/api-documentation",
};

export const pipedreamConnector: Connector = {
  id: "pipedream",
  name: "Pipedream",
  description: "Connect Pipedream workflows for continuous risk monitoring.",
  status: "coming_soon",
  credentialFields: [],
  capabilities: ["scan_workflow"],
  docsUrl: "https://pipedream.com/docs/api/",
};
