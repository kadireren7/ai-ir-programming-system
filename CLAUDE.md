# Torqa — Claude Instructions

## Core Goal

Torqa is NOT a workflow tool.

Torqa is a **universal automation governance layer**.

It sits above automation systems and provides:
- inspection
- policy enforcement
- decisioning
- auditability

---

## Long-Term Direction

Torqa aims to become a **standard control layer** for automation systems, similar to:
- Oracle (enterprise control systems)
- ServiceNow (process governance)
- Cloud IAM (access + policy enforcement)

But for: workflows, pipelines, and AI agents.

---

## What Torqa is NOT

- Not just an n8n tool
- Not a dashboard-only product
- Not a workflow builder
- Not a low-code platform
- Not a manual JSON scanning tool

---

## What Torqa IS

- A governance engine
- A decision system
- A policy layer
- An audit surface

---

## Core Architecture

All systems follow this pipeline:

Source → Adapter → WorkflowBundle → PolicyPack → GovernanceReport → UI / API / CI

---

## Primary User Flow

Connect source → Sync workflows → Run automated scans → Review → Enforce → Automate

Manual scan must exist only as an advanced option (Advanced → Manual Upload). It must NOT be the default experience.

---

## Core Principles

- Automation-first
- Source-connected workflows
- Minimalist UX
- Enterprise-ready structure
- Deterministic analysis (no hidden AI magic)
- No workflow execution
- Policy-driven decisions

Every workflow must produce:
- trust_score
- decision (approve / review / block)
- findings
- policy pack used

---

## Development Phases

### Phase 1 — DONE
- Adapter system
- Policy packs
- Governance reports

### Phase 2 — CURRENT
- UI / Dashboard
- Integration Center

### Phase 3 — NEXT
- Real data binding
- Source connections
- OAuth integrations

### Phase 4 — LATER
- Multi-source governance
- Audit logs
- Enterprise features

---

## Current Priority

1. Integration Center
2. Provider connections
3. GovernanceReport in UI

---

## Navigation Structure

Main navigation must be:
- Home
- Sources
- Workflows
- Runs
- Policies
- Automations
- Reports
- Settings

Manual scan must NOT be a main navigation item.

---

## Sources / Integration Strategy

Sources are the core of Torqa.

Connections must look like "Connect GitHub", "Connect n8n" — NOT "Paste API key".

Supported:
- n8n (active)
- GitHub (active)
- Zapier (planned)
- Make (planned)
- Pipedream (planned)
- AI agents (planned)
- Generic webhook/API

Each source must define:
- connection method
- credential schema
- workflow fetch
- scan integration

---

## Design Style

UI must feel like a **control panel** or **command center** — serious, minimal, enterprise-grade. NOT a playful dashboard or colorful SaaS toy.

Inspired by: Torq.co, Vercel, Linear

Rules:
- Dark-first
- Cyan accent system
- Subtle motion only — no heavy animation
- Functional over decorative
- Prefer whitespace and clarity
- No visual noise

---

## UX Rules

- Every page must have ONE primary action
- Avoid clutter, avoid too many cards
- Mobile-first design
- Tables must degrade into cards on mobile
- Sidebar must not overwhelm users

---

## Technical Rules

- Never expose secrets to client
- API keys must be masked
- Use server-side handling for connectors
- Use typed interfaces for connectors
- Avoid breaking existing APIs
- Keep backward compatibility
- Prefer extension over rewrite
- Minimal diffs > full rewrites
- Strong typing where possible
- Clear boundaries between layers

---

## What NOT to Do

- Do NOT make manual scan the main feature
- Do NOT add random UI sections
- Do NOT overcomplicate navigation
- Do NOT introduce AI where deterministic logic exists
- Do NOT create unfinished fake features without marking them
- Do NOT overengineer or prematurely abstract
- Do NOT rewrite stable code

---

## Output Expectations

When making changes:
- Keep UX simple
- Keep code modular
- Explain changes clearly
- Ensure tests pass
