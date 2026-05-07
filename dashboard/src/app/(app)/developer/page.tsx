"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Code2, Copy, Check, ExternalLink, Key, Webhook, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-lg border border-border/50 bg-muted/30 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{language}</span>
        <button type="button" onClick={() => void copy()} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-xs leading-relaxed">{code}</pre>
    </div>
  );
}

const endpoints = [
  { method: "POST", path: "/api/public/scan", desc: "Scan a workflow JSON and get governance results", auth: true },
  { method: "POST", path: "/api/public/policy/evaluate", desc: "Evaluate a scan result against a policy pack", auth: true },
  { method: "POST", path: "/api/public/policy/simulate", desc: "Simulate policy pack evaluation on findings", auth: true },
  { method: "GET", path: "/api/public/policy-packs", desc: "List available policy packs", auth: true },
  { method: "POST", path: "/api/public/risks/accept", desc: "Accept a risk programmatically", auth: true },
  { method: "GET", path: "/api/public/audit/decisions", desc: "Query governance decisions", auth: true },
  { method: "POST", path: "/api/public/audit/export", desc: "Export audit log (CSV / JSON / PDF)", auth: true },
  { method: "GET", path: "/api/openapi.json", desc: "OpenAPI 3.0 spec (machine-readable)", auth: false },
  { method: "GET", path: "/api/health", desc: "Service health check", auth: false },
];

const webhookExample = `POST /api/sources/agent/webhook
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "event": "workflow.updated",
  "agentId": "my-agent-v2",
  "definition": {
    "name": "My Agent",
    "tools": [...],
    "system_prompt": "..."
  }
}`;

const mcpClaudeConfig = `// claude_desktop_config.json
{
  "mcpServers": {
    "torqa": {
      "command": "npx",
      "args": ["-y", "@torqa/mcp-proxy"],
      "env": {
        "TORQA_API_KEY": "torqa_live_<your_key>",
        "TORQA_MCP_URL": "https://app.torqa.dev/api/mcp"
      }
    }
  }
}`;

const mcpDirectExample = `// JSON-RPC 2.0 — direct HTTP call
POST https://app.torqa.dev/api/mcp
x-api-key: torqa_live_<your_key>
Content-Type: application/json

// 1. List tools
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }

// 2. Scan a workflow
{
  "jsonrpc": "2.0", "id": 2, "method": "tools/call",
  "params": {
    "name": "torqa_scan",
    "arguments": {
      "source": "n8n",
      "content": { ...workflow_json... }
    }
  }
}`;

const scanExample = `curl -X POST https://app.torqa.dev/api/public/scan \\
  -H "x-api-key: torqa_live_<your_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "n8n",
    "content": { ...workflow_json... }
  }'`;

const webhookVerifyExample = `import { createHmac } from "crypto";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return signature === \`sha256=\${expected}\`;
}

// In your webhook handler:
const sig = req.headers["x-torqa-signature"];
const body = await req.text();
if (!verifyWebhookSignature(body, sig, process.env.WEBHOOK_SECRET!)) {
  return res.status(401).send("Invalid signature");
}`;

export default function DeveloperPage() {
  return (
    <div className="space-y-10 pb-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Developer</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">API Reference</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Integrate Torqa governance scanning into your CI/CD pipelines, agent systems, and automation platforms.
        </p>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/api/openapi.json" target="_blank">
            <Code2 className="h-3.5 w-3.5" />
            OpenAPI Spec
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/settings/api">
            <Key className="h-3.5 w-3.5" />
            Manage API Keys
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/settings/webhooks">
            <Webhook className="h-3.5 w-3.5" />
            Enforcement Webhooks
          </Link>
        </Button>
      </div>

      {/* Authentication */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Authentication</p>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4 text-cyan-400" />
              API Key Authentication
            </CardTitle>
            <CardDescription className="text-xs">
              All public API endpoints require an API key. Generate one in Settings → API Keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={scanExample} language="curl" />
          </CardContent>
        </Card>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Endpoints</p>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border/50">
          {endpoints.map((ep, i) => (
            <div key={ep.path} className={`flex flex-wrap items-center gap-3 bg-card px-5 py-3 ${i !== endpoints.length - 1 ? "border-b border-border/40" : ""}`}>
              <Badge variant="outline" className={`shrink-0 font-mono text-[10px] ${ep.method === "POST" ? "border-cyan-500/30 text-cyan-400" : "border-border/60 text-muted-foreground"}`}>
                {ep.method}
              </Badge>
              <code className="text-xs text-foreground">{ep.path}</code>
              <span className="text-xs text-muted-foreground flex-1">{ep.desc}</span>
              {ep.auth && <Badge variant="secondary" className="text-[10px]">API key</Badge>}
            </div>
          ))}
        </div>
      </div>

      {/* Webhooks */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Webhooks</p>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Inbound: AI Agent Webhook</CardTitle>
              <CardDescription className="text-xs">
                Push workflow updates from your agent to trigger automatic re-scans.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={webhookExample} language="http" />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Outbound: Enforcement Webhooks</CardTitle>
              <CardDescription className="text-xs">
                Torqa calls your endpoint on FAIL / NEEDS REVIEW / PASS decisions. Verify the HMAC signature.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={webhookVerifyExample} language="typescript" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MCP Server */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">MCP Server</p>
          <Badge variant="secondary" className="text-[10px]">new</Badge>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <p className="text-xs text-muted-foreground max-w-xl">
          Use Torqa as an MCP (Model Context Protocol) tool server. Connect Claude, Cursor, or any MCP-compatible AI assistant to scan workflows, evaluate policies, and query audit findings — directly from your AI conversation.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-cyan-400" />
                Claude Desktop / Cursor
              </CardTitle>
              <CardDescription className="text-xs">
                Add Torqa to your Claude Desktop or Cursor MCP config to use governance tools in AI chat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={mcpClaudeConfig} language="json" />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Direct HTTP (JSON-RPC 2.0)</CardTitle>
              <CardDescription className="text-xs">
                Call the MCP server directly with your API key. Supports: <code className="font-mono text-[10px]">torqa_scan</code>, <code className="font-mono text-[10px]">torqa_findings</code>, <code className="font-mono text-[10px]">torqa_policy_list</code>, <code className="font-mono text-[10px]">torqa_audit</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={mcpDirectExample} language="http" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CI/CD */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CI / CD</p>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              GitHub Actions
            </CardTitle>
            <CardDescription className="text-xs">
              Add the Torqa GitHub Action to your workflow to gate PRs on governance scan results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`- uses: torqa/scan-action@v2
  with:
    api-key: \${{ secrets.TORQA_API_KEY }}
    source: github
    workflow-file: .github/workflows/deploy.yml
    policy-pack-id: \${{ vars.TORQA_POLICY_PACK_ID }}
    fail-on: FAIL`} language="yaml" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
