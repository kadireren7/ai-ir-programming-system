import { describe, it, expect } from "vitest";
import { connectorRegistry, getConnector } from "./registry";

describe("connectorRegistry", () => {
  it("contains all expected connectors", () => {
    const ids = connectorRegistry.map((c) => c.id);
    expect(ids).toContain("n8n");
    expect(ids).toContain("github");
    expect(ids).toContain("webhook");
    expect(ids).toContain("zapier");
    expect(ids).toContain("make");
    expect(ids).toContain("pipedream");
  });

  it("available connectors have credential fields", () => {
    const available = connectorRegistry.filter((c) => c.status === "available");
    for (const c of available) {
      expect(c.credentialFields.length).toBeGreaterThan(0);
    }
  });

  it("coming_soon connectors have empty credential fields", () => {
    const comingSoon = connectorRegistry.filter((c) => c.status === "coming_soon");
    for (const c of comingSoon) {
      expect(c.credentialFields).toHaveLength(0);
    }
  });

  it("getConnector returns correct connector", () => {
    const n8n = getConnector("n8n");
    expect(n8n?.name).toBe("n8n");
    expect(n8n?.status).toBe("available");
  });

  it("getConnector returns undefined for unknown id", () => {
    expect(getConnector("nonexistent")).toBeUndefined();
  });

  it("n8n connector has required capabilities", () => {
    const n8n = getConnector("n8n");
    expect(n8n?.capabilities).toContain("test_connection");
    expect(n8n?.capabilities).toContain("list_workflows");
    expect(n8n?.capabilities).toContain("scan_workflow");
  });

  it("github connector supports pr_comments and webhook", () => {
    const gh = getConnector("github");
    expect(gh?.capabilities).toContain("pr_comments");
    expect(gh?.capabilities).toContain("webhook");
  });

  it("all connectors have name and description", () => {
    for (const c of connectorRegistry) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    }
  });
});
