# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No user-facing changes yet._

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

[Unreleased]: https://github.com/kadireren7/Torqa/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/kadireren7/Torqa/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/kadireren7/Torqa/compare/v0.1.1...v0.1.4
[0.1.1]: https://github.com/kadireren7/Torqa/releases/tag/v0.1.1
[0.1.0]: https://github.com/kadireren7/Torqa/releases/tag/v0.1.0
