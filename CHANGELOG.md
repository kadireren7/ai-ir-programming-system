# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No user-facing changes yet._

## [0.2.0] — 2026-05-02

Release track: **AI agent adapter, GitHub Actions adapter, SVG logo assets, Next.js 16 proxy layer.**

### Added

- **AI Agent source adapter** (`src/torqa/integrations/agent/`): parses agent definitions, runs 18+ governance checks (system prompt injection, dangerous tool permissions, missing human-in-the-loop, runaway iteration limits).
- **GitHub Actions source adapter** (`src/torqa/integrations/github_actions/`): parses YAML workflows, analyzes jobs/steps/run commands/action pinning.
- **SVG logo assets** and updated branding.
- **Next.js 16 middleware → proxy migration** for deployment compatibility.

### Fixed

- ESLint flat config migration for Next.js 16 lint command.
- Credential-fields assertion scoped to auth-requiring connectors in tests.

### Version alignment

- `dashboard/package.json`: `0.2.0`
- `pyproject.toml`: `0.2.0`
- `dashboard/public/openapi.yaml`: `0.2.0`
- `docker-compose.yml`: `v0.2.0`
- `charts/torqa/values.yaml`: `0.2.0`

## [0.1.9] — 2026-05-01

Release track: **source connections, enforcement webhooks, GitHub Actions integration, AI agent scan, audit log, CI workflow.**

### Added

- Real source connection flow (n8n, GitHub OAuth).
- Enforcement webhook system.
- Audit log page.
- GitHub Actions CI workflow integration.

### Fixed

- Playwright selector stability for E2E tests.
- CI and deployment failures.

## [0.1.8] — 2026-04-30

Release track: **UI stabilization and accessibility hardening.**

### Fixed

- Axe contrast fixes for WCAG 2.1 AA compliance.
- Smoke E2E selector alignment with updated UI.
- ESLint JSX text escaping in workflows empty state.

## [0.1.7] — 2026-04-30

Release track: **automation-first UI, connector registry, premium redesign, and WCAG 2.1 AA hardening.**

### What this means for users

- The dashboard is now an automation control center — connect a source and governance starts automatically.
- Manual scan is preserved as an advanced option (`/advanced/manual-scan`), not the primary flow.
- Accessibility is enforced in CI with a full axe WCAG 2.1 AA gate (`@axe-core/playwright`).

### Added

- **Automation-first overview**: new hero (`text-4xl/5xl`), active sources strip (n8n, GitHub, Webhook), last-run card, risk-score card, and framer-motion fade-up animations throughout.
- **Runs page card layout**: table replaced with responsive card grid (mobile and desktop).
- **FadeUp motion component** (`src/components/motion/fade-up.tsx`): respects `prefers-reduced-motion`.
- **WCAG 2.1 AA contrast fixes**: darkened `--primary` (38% → 28% lightness) and `--muted-foreground` (46% → 40%) in light mode for all small text; emerald badge text moved to `text-emerald-800`.
- **CI a11y gate activated**: axe `@axe-core/playwright` now in `dashboard-accessibility.yml` workflow.

### Changed

- `release.yml` now runs **only on `workflow_dispatch`** (tag-push trigger removed) — no accidental PyPI publishes on version tags.
- `smoke.spec.ts` updated to assert new heading and CTAs (`"Workflow governance, automated."`, `"Connect a source"`, `"Advanced: manual scan"`).
- Navigation unchanged from v0.1.6 (Home · Sources · Workflows · Runs · Policies · Automations · Reports · Settings).

### Version alignment

- `dashboard/package.json`: `0.1.7`
- `pyproject.toml`: `0.1.7`
- `dashboard/public/openapi.yaml`: `0.1.7`
- `docs/api.md`: updated to v0.1.7

## [0.1.6] — 2026-04-29

Release track: **dashboard automation, onboarding, integrations, operator packaging, and PyPI-ready CLI** (incremental; self-host friendly). See [docs/launch-checklist.md](docs/launch-checklist.md) § “0.1.6 release verification” before tagging.

### What this means for users

- You can move from first scan to recurring governance faster: upload, scan, review, share, schedule, alert.
- Public/demo-facing report UX is clearer for non-authors (risk, policy, findings, recommendations, PDF export).
- Launch docs now include TestPyPI and release process steps so teams can install and evaluate with less friction.

### Added

- **PyPI packaging prep:** `torqa` wheel ships `semantic_warning_policy_bundle.json` under `torqa/data/`, bundled n8n quickstart sample under `torqa/bundled/`, `[tool.setuptools.package-data]` for JSON assets, `docs/release-process.md`, README install matrix (stable / TestPyPI / editable / Git), and release workflow **artifact upload** for `dist/`.
- **Custom cron schedules** on `scan_schedules` (`frequency=custom`, `cron_expression`, `cron_timezone`) with UI presets, validated via `cron-parser`, and honored in `POST /api/scan-schedules/cron/tick` + schedule bump logic.
- **Onboarding wizard** (first-run dialog) with `user_onboarding_progress` table and `GET/PATCH /api/onboarding/progress`.
- **GitHub webhook** receiver: `POST /api/webhooks/github` with `X-Hub-Signature-256` verification (`GITHUB_WEBHOOK_SECRET`).
- **n8n workflow list proxy**: `GET /api/integrations/n8n/workflows` (session auth; `N8N_BASE_URL` + `N8N_API_KEY` on server).
- **Alert delivery**: Slack/Discord test paths verify HTTP status; **Resend** email when `RESEND_API_KEY` (+ optional `TORQA_ALERT_FROM_EMAIL`) is set.
- **Docker** `dashboard/Dockerfile` + root `docker-compose.yml`; **Helm** baseline chart under `charts/torqa/`; **cron helper** `scripts/torqa-cron-tick.sh`.
- **Docs**: `docs/workspace-limits.md` (roles and soft limits); expanded `dashboard/public/openapi.yaml` (version **0.1.6**); Vitest coverage for cron parsing; `docs/backlog-0.1.7.md` for follow-ups.

### Changed

- **Integrations** page documents server hooks and offers n8n JSON preview; GitHub provider marked available for webhook-led flows.
- **Schedules** UI explains UTC/custom cron and fixes last-run status labels (`completed` vs legacy “succeeded”).
- **Insights** adds “Email snapshot” (`mailto:`) beside CSV / print.
- **Login** landmark: `role="main"` on the sign-in surface for accessibility tooling.
- **`.env.example`**: grouped and documented variables for cron, Resend, GitHub webhook, and n8n preview.

### Fixed

- **Migration `20260430180000_v016_cron_onboarding.sql`**: idempotent RLS policies and trigger (`DROP … IF EXISTS` before `CREATE`) so `supabase db push` retries do not fail on duplicate policy/trigger errors.

### Known limitations

- **GitHub:** webhook validates and returns metadata only; auto-scan and PR comments require a separate worker with repo credentials (see backlog).
- **Email:** live alert fan-out uses Resend when configured; otherwise email destinations are skipped without failing scans.
- **n8n preview:** lists workflows via server env; does not sync labels/tags into n8n or auto-queue scans.
- **WCAG:** no bundled `@axe-core/playwright` gate in CI yet (see [docs/backlog-0.1.7.md](docs/backlog-0.1.7.md)).
- **Helm chart:** minimal Deployment/Service only — ingress, secrets, and HPA are operator-defined.

## [0.1.5] — 2026-04-28

v0.1.5 continues the adoption and release-quality work started in the prior rapid iteration.

### Added

- **`torqa quickstart`** one-command first-run flow for fast local evaluation of bundled n8n sample.
- **Report JSON artifact mode** (`torqa report --format json`) with executive summary, key findings, and next-step guidance (`torqa.report.v1`).
- **Public API envelope helpers** for consistent external response shape (`ok`, `data/error`, `meta`) in `/api/public/scan` with `?legacy=1` compatibility mode.
- **Overview product-signal metrics**: scans this week, policy failures, high-risk scans, schedule success rate, and top finding rules.

### Changed

- **CLI help docs** now include quickstart and report JSON usage paths.
- **HTML reports** now surface executive summary and key blocked/review findings first for stakeholder sharing.
- **Overview onboarding flow** now includes explicit schedule creation step and clearer first-run trust guidance.

## [0.1.4] — 2026-04-28

### Added

- **Engine trust metadata** in dashboard scan responses: `engine_mode`, `analysis_kind`, and `fallback` (`fallback_used`, `fallback_from`, `fallback_to`, `fallback_reason`) so users can distinguish real engine analysis from preview/fallback output.
- **Fallback control** with `TORQA_ALLOW_PREVIEW_FALLBACK` to prevent silent trust downgrade in production.
- **Cron schedule execution MVP** in `POST /api/scan-schedules/cron/tick` with debug counters (`schedules_checked`, `schedules_run`, `succeeded`, `failed`, `errors`).
- **n8n findings hardening** for hardcoded secret-like values, plaintext HTTP transport, missing workflow failure path signal, and disabled-node drift hints.
- **Focused tests** for hosted provider fallback policy and expanded n8n finding coverage.

### Changed

- **Manual schedule run API** now returns explicit run diagnostics and refuses disabled schedules.
- **Scheduled scan execution path** now dispatches scan-context alert rules for risky/policy-failing outcomes, not only schedule-failed alerts.
- **Dashboard scan report UX** now shows explicit engine/trust labels (real/preview/fallback), fallback warning banners, policy status, and risk level labels.
- **Docs alignment** across README, dashboard README, architecture/status/roadmap/launch checklist, and n8n integration docs for v0.1.4 reliability scope.

## [0.1.1] — 2026-04-26

### Added

- **n8n adapter** (`src/torqa/integrations/n8n/`): parse exported workflow JSON, static findings, CLI **`--source n8n`** on validate / scan / inspect / doctor, and **`torqa import n8n … --out`**.
- **Ruff** configuration in `pyproject.toml` and a **`ruff check src tests`** step in the **Packaging** GitHub Actions workflow.

### Fixed

- **Trust scoring:** failures in modular **advanced analysis** are no longer ignored. `compute_trust_score` records **`trust_scoring_issues`** (structured `code` + `message`), appends **policy warnings**, adds an **`advanced_analysis_failed`** score factor (0 points, explicit detail), and notes the situation in **`score_rationale`**. **`torqa validate --json`** exposes **`policy.trust_scoring_issues`**.
- **n8n → IR:** the adapter emits a **single** `integration_external_step` transition so canonical IR **duplicate (effect, from, to) triple** rules are satisfied; **node-level** context remains in **`metadata.integration.findings`** and **`metadata.integration.transition_to_node`** (`n8n_nodes_ordered`).

### Changed

- **Packaging:** internal package layout now uses the standard **`torqa.*`** import namespace.
- **Compatibility note:** for early source users, **`src.*`** imports were replaced by **`torqa.*`**.
- **Project identity:** `pyproject.toml` **Repository / Issues / Changelog** URLs and README badges and clone instructions point to **`https://github.com/kadireren7/Torqa`** (default directory **`Torqa`** after `git clone`).
- **Documentation:** README and **`docs/integrations/n8n.md`** clarify that Torqa **does not execute** n8n, that n8n is an **adapter layer**, how the **IR** and **scan JSON** relate to **findings** and **n8n node ids**.
- **Docs:** moved early release and self-test reports to **`docs/reports/`** (`RELEASE_NOTES_v0.md`, `SELF_TEST_REPORT.md`).

### Maintenance

- **`.gitignore`:** ignore **`dashboard/node_modules`**, **`.next`**, **`.turbo`**, and related generated frontend paths.
- **`CONTRIBUTING.md`**, **`.github/ISSUE_TEMPLATE/`**, **`SECURITY.md`**, **`docs/roadmap.md`:** links updated to the **Torqa** repository.
- **`pyproject.toml`:** **`torqa[dev]`** now includes **Ruff** for local linting.
- **Chore:** removed unused root **`templates/`** placeholder directories (`.gitkeep` only).

### Testing

- Full **`pytest`** suite kept green; added regression coverage for trust scoring when advanced analysis raises.

## [0.1.0] — 2026-04-16

First early public release of the Torqa core: canonical IR, validation, reference `.tq` surface, CLI, and documentation aimed at technical evaluation.

### Initial public milestones

- Published **versioned IR** (`ir_goal`) with **JSON Schema** (`spec/IR_BUNDLE.schema.json`) and a **reference Python** implementation under `src/`.
- Established **structural** validation (`validate_ir`) and **semantic** reporting (`build_ir_semantic_report`) as the shared product boundary; execution remains out of scope.

### Parser hardening

- Strict **`tq_v1`** parsing with deterministic mapping to bundle JSON, stable **error codes** (e.g. `PX_TQ_*`), and explicit rules for headers, `flow:` steps, and optional constructs documented in [Concepts](docs/concepts.md).

### CLI

- Introduced the **`torqa`** command: **`validate`**, **`inspect`**, **`doctor`**, **`version`** — load → `ir_goal_from_json` → `validate_ir` → semantic checks, with no execution engine.

### JSON input support

- **`torqa`** accepts **`.json`** as well as **`.tq`**: full bundle (`ir_goal` + optional `library_refs`) or bare **`ir_goal`** where allowed, with the same validation path as text input.

### Flagship demo

- Added **[Flagship demo](docs/flagship-demo.md)** — one guided story (`.tq` and JSON, same contract) for reviewers new to the project.

### Metadata block support

- Optional **`meta:`** block in `.tq` for **audit / ownership** strings carried into **`metadata.surface_meta`** (see [Examples](docs/examples.md)); does not alter effect semantics.

---

Earlier development history is folded into **0.1.0** for clarity; subsequent versions list incremental changes here.

[Unreleased]: https://github.com/kadireren7/Torqa/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kadireren7/Torqa/compare/v0.1.9...v0.2.0
[0.1.9]: https://github.com/kadireren7/Torqa/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/kadireren7/Torqa/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/kadireren7/Torqa/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/kadireren7/Torqa/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/kadireren7/Torqa/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/kadireren7/Torqa/compare/v0.1.1...v0.1.4
[0.1.1]: https://github.com/kadireren7/Torqa/releases/tag/v0.1.1
[0.1.0]: https://github.com/kadireren7/Torqa/releases/tag/v0.1.0
