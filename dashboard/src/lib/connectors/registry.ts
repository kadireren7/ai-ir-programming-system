import { n8nConnector } from "./n8n-connector";
import { githubConnector } from "./github-connector";
import { webhookConnector } from "./webhook-connector";
import { zapierConnector, makeConnector, pipedreamConnector } from "./placeholder-connectors";
import type { Connector } from "./types";

export const connectorRegistry: Connector[] = [
  n8nConnector,
  githubConnector,
  webhookConnector,
  zapierConnector,
  makeConnector,
  pipedreamConnector,
];

export function getConnector(id: string): Connector | undefined {
  return connectorRegistry.find((c) => c.id === id);
}

export { n8nConnector, githubConnector, webhookConnector, zapierConnector, makeConnector, pipedreamConnector };
export type { Connector };
