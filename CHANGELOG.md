# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Packaging:** library and CLI code now live under the **`torqa`** Python package (`src/torqa/`). Imports use **`torqa.*`** (replacing **`src.*`**). Console script and **`python -m torqa`** entrypoint: **`torqa.cli.main:main`**.
- **Docs:** moved early release and self-test reports to **`docs/reports/`** (`RELEASE_NOTES_v0.md`, `SELF_TEST_REPORT.md`).

### Removed

- **Chore:** removed unused root **`templates/`** placeholder directories (`.gitkeep` only).

## [0.1.1] — 2026-04-26

### Added

- **n8n adapter** (`src/integrations/n8n/`): parse exported workflow JSON, static findings, CLI **`--source n8n`** on validate / scan / inspect / doctor, and **`torqa import n8n … --out`**.
- **Ruff** configuration in `pyproject.toml` and a **`ruff check src tests`** step in the **Packaging** GitHub Actions workflow.

### Fixed

- **Trust scoring:** failures in modular **advanced analysis** are no longer ignored. `compute_trust_score` records **`trust_scoring_issues`** (structured `code` + `message`), appends **policy warnings**, adds an **`advanced_analysis_failed`** score factor (0 points, explicit detail), and notes the situation in **`score_rationale`**. **`torqa validate --json`** exposes **`policy.trust_scoring_issues`**.
- **n8n → IR:** the adapter emits a **single** `integration_external_step` transition so canonical IR **duplicate (effect, from, to) triple** rules are satisfied; **node-level** context remains in **`metadata.integration.findings`** and **`metadata.integration.transition_to_node`** (`n8n_nodes_ordered`).

### Changed

- **Project identity:** `pyproject.toml` **Repository / Issues / Changelog** URLs and README badges and clone instructions point to **`https://github.com/kadireren7/Torqa`** (default directory **`Torqa`** after `git clone`).
- **Documentation:** README and **`docs/integrations/n8n.md`** clarify that Torqa **does not execute** n8n, that n8n is an **adapter layer**, how the **IR** and **scan JSON** relate to **findings** and **n8n node ids**.

### Maintenance

- **`.gitignore`:** ignore **`dashboard/node_modules`**, **`.next`**, **`.turbo`**, and related generated frontend paths.
- **`CONTRIBUTING.md`**, **`.github/ISSUE_TEMPLATE/`**, **`SECURITY.md`**, **`docs/roadmap.md`:** links updated to the **Torqa** repository.
- **`pyproject.toml`:** **`torqa[dev]`** now includes **Ruff** for local linting.

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

[Unreleased]: https://github.com/kadireren7/Torqa/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/kadireren7/Torqa/releases/tag/v0.1.1
[0.1.0]: https://github.com/kadireren7/Torqa/releases/tag/v0.1.0
