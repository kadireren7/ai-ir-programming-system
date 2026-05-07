import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Torqa Public API",
    version: "2.0.0",
    description: "Governance-as-a-service API for automation workflow scanning, policy enforcement, and audit trails.",
    contact: { name: "Torqa", url: "https://torqa.dev" },
  },
  servers: [
    { url: "{appUrl}/api/public", variables: { appUrl: { default: "https://app.torqa.dev" } } },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API key from Settings → API Keys. Include as `x-api-key: torqa_live_<key>` header.",
      },
    },
    schemas: {
      ScanFinding: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["info", "review", "high", "critical"] },
          rule_id: { type: "string", example: "v1.webhook.public_no_auth" },
          target: { type: "string", example: "workflow.nodes[0]" },
          explanation: { type: "string" },
          suggested_fix: { type: "string" },
          signature: { type: "string", description: "SHA-256 content hash of this finding" },
        },
        required: ["severity", "rule_id", "target", "explanation", "suggested_fix"],
      },
      ScanResult: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["PASS", "NEEDS REVIEW", "FAIL"] },
          riskScore: { type: "integer", minimum: 0, maximum: 100 },
          source: { type: "string" },
          findings: { type: "array", items: { "$ref": "#/components/schemas/ScanFinding" } },
          totals: {
            type: "object",
            properties: {
              high: { type: "integer" },
              review: { type: "integer" },
              info: { type: "integer" },
            },
          },
          engine: { type: "string" },
          policyEvaluation: {
            type: "object",
            nullable: true,
            properties: {
              policyStatus: { type: "string", enum: ["pass", "fail", "needs_review"] },
              appliedPolicyName: { type: "string" },
            },
          },
        },
        required: ["status", "riskScore", "source", "findings", "totals"],
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          requestId: { type: "string" },
        },
        required: ["error"],
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/scan": {
      post: {
        summary: "Scan a workflow",
        description: "Run a governance scan on a workflow JSON object. Returns findings, trust score, and decision.",
        operationId: "scanWorkflow",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["source", "content"],
                properties: {
                  source: {
                    type: "string",
                    enum: ["n8n", "github", "zapier", "make", "pipedream", "ai-agent", "generic"],
                    description: "Workflow source adapter to use for analysis.",
                  },
                  content: {
                    type: "object",
                    description: "The workflow JSON to scan. Shape depends on the source adapter.",
                  },
                  policyPackId: {
                    type: "string",
                    format: "uuid",
                    description: "Optional. Apply a specific policy pack v2 for governance evaluation.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Scan completed",
            content: { "application/json": { schema: { "$ref": "#/components/schemas/ScanResult" } } },
          },
          "400": { description: "Bad request", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
        },
      },
    },
    "/policy/evaluate": {
      post: {
        summary: "Evaluate a scan against a policy",
        operationId: "evaluatePolicy",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["scanResult", "policyPackId"],
                properties: {
                  scanResult: { "$ref": "#/components/schemas/ScanResult" },
                  policyPackId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Policy evaluation result" },
          "400": { description: "Bad request", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/policy/simulate": {
      post: {
        summary: "Simulate a policy pack evaluation",
        operationId: "simulatePolicy",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["findings", "policyPackId"],
                properties: {
                  findings: { type: "array", items: { "$ref": "#/components/schemas/ScanFinding" } },
                  policyPackId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Simulation result" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/policy-packs": {
      get: {
        summary: "List policy packs",
        operationId: "listPolicyPacks",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "per_page", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          "200": { description: "List of policy packs" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/risks/accept": {
      post: {
        summary: "Accept a risk",
        operationId: "acceptRisk",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ruleId", "target", "rationale"],
                properties: {
                  ruleId: { type: "string" },
                  target: { type: "string" },
                  rationale: { type: "string" },
                  expiresAt: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Risk accepted" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/audit/decisions": {
      get: {
        summary: "List governance decisions",
        operationId: "listDecisions",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 500 } },
          { name: "decision", in: "query", schema: { type: "string", enum: ["approve", "review", "block"] } },
          { name: "since", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": { description: "List of governance decisions" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/audit/export": {
      post: {
        summary: "Export audit log",
        operationId: "exportAudit",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  format: { type: "string", enum: ["csv", "json", "pdf"], default: "json" },
                  since: { type: "string", format: "date-time" },
                  until: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Exported audit data" },
          "401": { description: "Unauthorized" },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(SPEC, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
