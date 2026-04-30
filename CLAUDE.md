\# Torqa — Claude Instructions



\## Product Direction



Torqa is an automation-first governance platform.



It is NOT a manual JSON scanning tool.



Manual scan must exist only as an advanced option.



Primary user flow:

Connect source → Sync workflows → Run automated scans → Review → Enforce → Automate



\---



\## Core Principles



\- Automation-first

\- Source-connected workflows

\- Minimalist UX

\- Enterprise-ready structure

\- Deterministic analysis (no hidden AI magic)

\- No workflow execution

\- Policy-driven decisions



\---



\## UX Rules



\- Every page must have ONE primary action

\- Avoid clutter, avoid too many cards

\- Prefer whitespace and clarity

\- Mobile-first design

\- Tables must degrade into cards on mobile

\- Sidebar must not overwhelm users



\---



\## Navigation Structure



Main navigation must be:



\- Home

\- Sources

\- Workflows

\- Runs

\- Policies

\- Automations

\- Reports

\- Settings



Manual scan must NOT be a main navigation item.



\---



\## Sources System



Sources are the core of Torqa.



Supported:

\- n8n (active)

\- GitHub (active)

\- Zapier (planned)

\- Make (planned)

\- Pipedream (planned)

\- Generic webhook/API



Each source must define:

\- connection method

\- credential schema

\- workflow fetch

\- scan integration



\---



\## Manual Scan



Manual scan must exist under:

Advanced → Manual Upload



It must NOT be the default experience.



\---



\## Design Style



Follow:

\- Torq.co

\- Vercel

\- Linear



Rules:

\- Minimal

\- Clean

\- No heavy colors

\- Subtle animation only

\- Fast loading

\- No visual noise



\---



\## Technical Rules



\- Never expose secrets to client

\- API keys must be masked

\- Use server-side handling for connectors

\- Use typed interfaces for connectors

\- Avoid breaking existing APIs

\- Keep backward compatibility



\---



\## What NOT to do



\- Do NOT make manual scan the main feature

\- Do NOT add random UI sections

\- Do NOT overcomplicate navigation

\- Do NOT introduce AI where deterministic logic exists

\- Do NOT create unfinished fake features without marking them



\---



\## Development Priority



1\. Sources system

2\. Navigation simplification

3\. Automation flows

4\. Mobile UX

5\. Reports \& integrations

6\. Landing page polish



\---



\## Output Expectations



When making changes:

\- Keep UX simple

\- Keep code modular

\- Explain changes clearly

\- Ensure tests pass

