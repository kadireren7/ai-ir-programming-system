<div align="center">

<br />

<h1>Torqa</h1>

<p><strong>Universal automation governance layer.</strong><br />
Inspect, enforce, and audit every workflow — before it runs in production.</p>

<br />

[![Version](https://img.shields.io/badge/version-0.2.0-0ea5e9?style=flat-square)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10%2B-3b82f6?style=flat-square)](pyproject.toml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](dashboard/)
[![CI](https://github.com/kadireren7/Torqa/actions/workflows/ci.yml/badge.svg)](https://github.com/kadireren7/Torqa/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-51%20passing-22c55e?style=flat-square)](dashboard/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)](dashboard/tsconfig.json)

<br />

[Overview](#-overview) · [Screenshots](#-screenshots) · [Architecture](#-architecture) · [Dashboard](#-dashboard) · [Quickstart](#-quickstart) · [CLI](#-cli) · [GitHub Action](#-github-action) · [Changelog](CHANGELOG.md)

<br />

</div>

---

## Overview

Torqa sits **above** your automation systems and acts as a deterministic governance gate. It does not execute workflows — it inspects, scores, and enforces policy on workflow definitions before they reach production.

```
n8n  ·  GitHub Actions  ·  AI Agents  ·  Zapier  ·  Make  ─→  Torqa  ─→  PASS / NEEDS REVIEW / FAIL
```

**Why it matters:**

- Catch credential leaks, risky permissions, and policy violations at definition time — not at incident time.
- Every scan produces a **trust score**, a **decision**, and an auditable **findings report**.
- Works from CLI, CI/CD, REST API, or the live dashboard — same engine, same results.

---

## Screenshots

> Dashboard running locally. Dark-first, enterprise-grade control center.

| Screen | What you see |
|---|---|
| **Overview** | Governance health at a glance — trust score distribution, recent scan decisions, active sources |
| **Sources** | Connect your automation platforms — n8n, GitHub, AI agents |
| **Scan Report** | Per-scan findings, trust score, policy decision, PDF export |
| **Enforcement Webhooks** | Real-time outbound governance callbacks with HMAC-SHA256 signing |
| **Audit Log** | Full event trail across workspace activity |

> Screenshots will be added in v0.2.0 once the public demo environment is live.

![Torqa Sources](docs/images/screenshot-sources.png)

## Architecture

```
Source
  │
  ▼
Adapter (n8n · GitHub Actions · AI Agent · Generic)
  │
  ▼
WorkflowBundle
  │
  ├─► Scan Engine ──────────────────────────────────────────┐
  │     · structural analysis                               │
  │     · secret / credential detection                     │
  │     · permission & scope analysis                       │
  │     · policy enforcement (trust score, decision)        │
  │                                                         │
  ▼                                                         ▼
PolicyPack                                          GovernanceReport
  │                                                  · PASS / NEEDS REVIEW / FAIL
  ▼                                                  · trust_score (0–100)
WorkspacePolicy                                     · findings (severity, rule, target)
                                                    · policyEvaluation
                                                         │
                                          ┌──────────────┼──────────────┐
                                          ▼              ▼              ▼
                                        Dashboard      REST API      CI/CD
                                        (Next.js)   (Next.js RT)  (GitHub Action)
                                                                       │
                                                              Enforcement Webhooks
                                                           (HMAC-SHA256 signed POST)
```

**Key invariant:** same input → same output. No hidden LLM calls in the scan path. Every decision is traceable to a concrete finding.

<br />

## Dashboard

The **Next.js 16 dashboard** (`dashboard/`) is the team surface for Torqa. It provides:

| Feature | Description |
|---|---|
| **Integration Center** | Connect n8n, GitHub, AI agents. Auto-sync workflows on connect. |
| **Scan Schedules** | Automated recurring scans — cron, hourly, daily, manual. |
| **Governance Reports** | Per-scan trust score, findings, policy status, PDF export. |
| **Workspace Policies** | Custom enforcement thresholds per workspace or project. |
| **Alert Rules** | Slack, Discord, email — triggered on FAIL or review decisions. |
| **Enforcement Webhooks** | HMAC-signed outbound POST on every governance decision. |
| **Audit Log** | Full event trail — integrations, scans, API keys, policy changes. |
| **API Keys** | Machine-to-machine access for CLI and CI workflows. |
| **Multi-workspace** | Organization support with member roles and scoped governance. |

### Tech stack

```
Next.js 16 (App Router)   Supabase (auth · database · RLS)   Tailwind CSS
TypeScript (strict)        Vitest (unit)                       Playwright (e2e · a11y)
Radix UI / shadcn          HMAC-SHA256 (webhook signing)        @axe-core/playwright (WCAG 2.1 AA)
```

---

## Quickstart

### Dashboard (local)

```bash
git clone https://github.com/kadireren7/Torqa.git
cd Torqa/dashboard
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL + keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Supabase is optional for demo mode — the dashboard runs on mock data without it.

### Python CLI

```bash
pip install torqa
# or editable from source:
pip install -e ".[dev]"
```

```bash
torqa quickstart
torqa validate examples/integrations/minimal_n8n.json --source n8n
torqa scan examples/integrations/customer_support_n8n.json --source n8n
torqa report examples/integrations --format html -o torqa-report.html
```

---

## CLI

```bash
# Validate a workflow definition
torqa validate workflow.json --source n8n
torqa validate flow.tq --profile strict

# Scan for governance findings
torqa scan workflow.json --source n8n --json
torqa scan . --profile review-heavy

# Generate reports
torqa report . --format html -o report.html
torqa report . --format md -o report.md

# Import/convert
torqa import n8n workflow.json --out workflow.bundle.json

# Utilities
torqa version
torqa explain flow.tq
torqa compare flow.tq
```

Exit codes: `0` = PASS, `1` = FAIL/BLOCK, `2` = configuration error.

---

## GitHub Action

Drop-in CI governance gate — scans your workflow specs on every PR:

```yaml
name: Torqa Governance Gate

on: [push, pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  torqa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/torqa
        with:
          torqa-package-path: .
          scan-path: .
          profile: default
          upload-artifact: true
          comment-on-pr: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

Torqa posts a decision summary comment directly on the PR with trust score, decision badge, and top findings.

---

## Supported Sources

| Source | Status | What it scans |
|---|---|---|
| **n8n** | Active | Exported workflow JSON — nodes, credentials, HTTP methods, code execution |
| **GitHub Actions** | Active | Workflow YAML — permissions, secret exposure, unpinned actions, pwn-request patterns |
| **AI Agents** | Active | Agent definitions — prompt injection, dangerous tools, scope creep, privileged permissions |
| **Generic JSON/TQ** | Active | Any `ir_goal` bundle or raw workflow spec |
| **Zapier** | Beta | API key connection — scan Zap orchestrations |
| **Make** | Beta | API token connection — scan Make scenarios |
| **Pipedream** | Planned | — |

---

## What Torqa catches

**n8n**
- Credentials stored in workflow JSON
- Dangerous code nodes (`eval`, `exec`, shell calls)
- Exposed webhook endpoints without auth
- Unsafe HTTP methods targeting external endpoints
- Missing manual approval gates

**GitHub Actions**
- `contents: write` on pull request triggers
- Secrets echoed to logs
- Unpinned third-party actions (`uses: action@v1`)
- Self-hosted runners on public repos
- `pull_request_target` + PR head checkout (privilege escalation)

**AI Agents**
- Prompt injection attack surfaces
- Missing or oversized system prompts
- Dangerous tool permissions (`exec`, `file_write`, `db_write`, `network`)
- Scope creep (>15 tool definitions)
- Hardcoded secrets in prompts

---

## REST API

```http
POST /api/public/scan
Content-Type: application/json

{
  "source": "n8n",
  "content": { ...workflow }
}
```

Response envelope:

```json
{
  "ok": true,
  "data": {
    "status": "FAIL",
    "riskScore": 42,
    "findings": [...],
    "engine": "torqa-scan-v1"
  },
  "meta": { "version": "0.2.0" }
}
```

Full reference: [docs/api.md](docs/api.md)

---

## Enforcement Webhooks

Configure outbound HTTP callbacks that fire on every governance decision:

```json
POST https://your-endpoint.example.com/torqa
X-Torqa-Event: governance.decision
X-Torqa-Decision: FAIL
X-Torqa-Signature-256: sha256=<hmac>

{
  "event": "governance.decision",
  "decision": "FAIL",
  "riskScore": 31,
  "workflowName": "customer-support-automation",
  "source": "n8n",
  "findings": [...],
  "timestamp": "2026-05-01T21:00:00.000Z"
}
```

Verify the signature on your end:

```python
import hmac, hashlib

def verify(secret: str, body: bytes, header: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, header)
```

---

## Deployment

### Docker

```bash
docker build -f dashboard/Dockerfile -t torqa-dashboard .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  torqa-dashboard
```

### Docker Compose (full stack)

```bash
docker compose up
```

### Helm (Kubernetes)

```bash
helm install torqa charts/torqa/ \
  --set supabase.url=... \
  --set supabase.anonKey=...
```

---

## Release History

| Version | Date | Highlights |
|---|---|---|
| **v0.2.0** | 2026-05-02 | Real GitHub Actions + AI Agent adapters (Python + dashboard), SVG provider logos, Zapier/Make beta connections, scan route expanded to all sources, Next.js 16 |
| v0.1.9 | 2026-05-01 | Source connections, enforcement webhooks, GitHub Actions + AI agent scan engine, audit log, CI workflow |
| v0.1.8 | 2026-04-30 | Axe contrast fixes, smoke E2E alignment, UI stabilization |
| v0.1.7 | 2026-04-30 | Automation-first redesign, connector registry, WCAG 2.1 AA gate |

Full history: [CHANGELOG.md](CHANGELOG.md)

---

## Contributing

Issues, bug reports, and PRs are welcome.

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md)
- [SECURITY.md](SECURITY.md)
- [docs/architecture.md](docs/architecture.md)

---

## License

[MIT](LICENSE) — © 2026 Kadir Eren Altıntaş
