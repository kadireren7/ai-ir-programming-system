import { describe, expect, it } from "vitest";
import { decisionFrom, riskScoreFromFindings, runScanAnalysis, type ScanFinding } from "@/lib/scan-engine";

function baseN8nWorkflow() {
  return {
    nodes: [
      {
        id: "1",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        parameters: { path: "incoming" },
      },
      {
        id: "2",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        parameters: { url: "https://api.example.com", method: "GET" },
      },
      {
        id: "3",
        name: "Slack",
        type: "n8n-nodes-base.slack",
        parameters: {},
      },
    ],
    connections: {
      Webhook: {
        main: [[{ node: "HTTP Request", type: "main", index: 0 }]],
      },
      "HTTP Request": {
        main: [[{ node: "Slack", type: "main", index: 0 }]],
      },
    },
  };
}

function hasRule(findings: { rule_id: string }[], ruleId: string): boolean {
  return findings.some((f) => f.rule_id === ruleId);
}

describe("scan-engine v1 rules", () => {
  it("detects hardcoded secret values", () => {
    const payload = {
      nodes: [
        {
          id: "1",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          parameters: {
            url: "https://api.example.com",
            apiKey: "sk_live_123456789",
          },
        },
      ],
      connections: {},
    };
    const res = runScanAnalysis(payload, "n8n");
    expect(hasRule(res.findings, "v1.secret.plaintext_detected")).toBe(true);
    expect(res.findings.find((f) => f.rule_id === "v1.secret.plaintext_detected")?.severity).toBe("critical");
  });

  it("detects public webhook without auth", () => {
    const payload = {
      nodes: [
        {
          id: "1",
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          parameters: { path: "public-hook" },
        },
      ],
      connections: {},
    };
    const res = runScanAnalysis(payload, "n8n");
    expect(hasRule(res.findings, "v1.webhook.public_no_auth")).toBe(true);
  });

  it("detects HTTP plaintext transport", () => {
    const payload = {
      nodes: [
        {
          id: "1",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          parameters: { url: "http://insecure.example.com", method: "POST" },
        },
      ],
      connections: {},
    };
    const res = runScanAnalysis(payload, "n8n");
    expect(hasRule(res.findings, "v1.http.plaintext_transport")).toBe(true);
  });

  it("detects TLS verification disabled", () => {
    const payload = {
      nodes: [
        {
          id: "1",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          parameters: {
            url: "https://secure.example.com",
            method: "GET",
            rejectUnauthorized: false,
          },
        },
      ],
      connections: {},
    };
    const res = runScanAnalysis(payload, "n8n");
    expect(hasRule(res.findings, "v1.http.tls_verification_disabled")).toBe(true);
  });

  it("detects missing error handling on external request nodes", () => {
    const payload = baseN8nWorkflow();
    const res = runScanAnalysis(payload, "n8n");
    expect(hasRule(res.findings, "v1.http.missing_error_handling")).toBe(true);
    expect(hasRule(res.findings, "v1.flow.error_strategy_missing")).toBe(true);
  });

  it("detects webhook to side-effect chain risk", () => {
    const payload = {
      nodes: [
        {
          id: "1",
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          parameters: { path: "incoming" },
        },
        {
          id: "2",
          name: "Slack",
          type: "n8n-nodes-base.slack",
          parameters: {},
        },
      ],
      connections: {
        Webhook: {
          main: [[{ node: "Slack", type: "main", index: 0 }]],
        },
      },
    };
    const res = runScanAnalysis(payload, "n8n");
    expect(hasRule(res.findings, "v1.spam.direct_webhook_side_effect")).toBe(true);
  });

  it("detects disconnected/dead nodes", () => {
    const payload = {
      nodes: [
        {
          id: "1",
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          parameters: { path: "incoming" },
        },
        {
          id: "2",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          parameters: {},
        },
      ],
      connections: {},
    };
    const res = runScanAnalysis(payload, "n8n");
    expect(hasRule(res.findings, "v1.flow.unused_node")).toBe(true);
  });
});

describe("scan-engine v1 scoring thresholds", () => {
  it("returns PASS for score >= 85", () => {
    const findings: ScanFinding[] = [
      {
        severity: "info",
        rule_id: "test.info",
        target: "node",
        explanation: "info",
        suggested_fix: "fix",
      },
      {
        severity: "info",
        rule_id: "test.info2",
        target: "node2",
        explanation: "info",
        suggested_fix: "fix",
      },
    ];
    expect(riskScoreFromFindings(findings)).toBe(96);
    expect(decisionFrom(findings)).toBe("PASS");
  });

  it("returns NEEDS REVIEW for score >= 60 and < 85", () => {
    const findings: ScanFinding[] = [
      {
        severity: "critical",
        rule_id: "test.critical",
        target: "a",
        explanation: "critical",
        suggested_fix: "fix",
      },
      {
        severity: "review",
        rule_id: "test.review",
        target: "b",
        explanation: "review",
        suggested_fix: "fix",
      },
      {
        severity: "review",
        rule_id: "test.review2",
        target: "c",
        explanation: "review",
        suggested_fix: "fix",
      },
    ];
    expect(riskScoreFromFindings(findings)).toBe(64);
    expect(decisionFrom(findings)).toBe("NEEDS REVIEW");
  });

  it("returns FAIL for score < 60", () => {
    const findings: ScanFinding[] = [
      {
        severity: "critical",
        rule_id: "test.critical",
        target: "a",
        explanation: "critical",
        suggested_fix: "fix",
      },
      {
        severity: "critical",
        rule_id: "test.critical2",
        target: "b",
        explanation: "critical",
        suggested_fix: "fix",
      },
      {
        severity: "review",
        rule_id: "test.review",
        target: "c",
        explanation: "review",
        suggested_fix: "fix",
      },
      {
        severity: "review",
        rule_id: "test.review2",
        target: "d",
        explanation: "review",
        suggested_fix: "fix",
      },
    ];
    expect(riskScoreFromFindings(findings)).toBe(44);
    expect(decisionFrom(findings)).toBe("FAIL");
  });
});
