# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where applicable.

IR interchange versioning is separate from package semver — see [`docs/IR_VERSIONING.md`](docs/IR_VERSIONING.md) and bump checklist when changing `CANONICAL_IR_VERSION`.

## [Unreleased]

### Changed

- **Website package consolidation:** Removed the top-level **`webui/`** tree. The marketing bundle builds to **`website/dist/site/`**; FastAPI + `torqa-console` live in **`website/server/`** (`python -m website.server`). Docker and docs updated.
- **P73 (one website, one desktop):** Removed **`desktop_legacy/`** and **`torqa-desktop-legacy`**. Workspace materialize helpers moved to [`src/workspace_bundle_io.py`](src/workspace_bundle_io.py). **`GET /desktop`** is a **native-desktop pointer** only (removed browser IDE under the old web UI). **Electron** [`desktop/`](desktop/) UX: welcome flow when no folder, clearer first-run steps, less path noise in chrome. **Product site** [`website/`](website/) copy: fewer raw commands/paths on the homepage. Docs: [`docs/P73_PRODUCT_SURFACES.md`](docs/P73_PRODUCT_SURFACES.md); README, trial/quickstart, surface rules, and tests updated.
- **Marketing-only web:** Removed the browser **IR console**. **`GET /console`** **301 → `/`**. The public site is **premium marketing copy** only (no command cheatsheets); tooling is **CLI + TORQA Desktop**. [`website/`](website/) visual refresh (Plus Jakarta Sans, refined hero and cards).

### Added

- **P72 (official website):** Single **official product website** source at [`website/`](website/) (renamed from `product-site/`); build still outputs to `webui/static/site/` for `GET /`. [`webui/`](webui/) remains the **host** for `/`, `/console`, `/desktop`, and APIs — not a duplicate marketing site. Role table: [`docs/P72_WEBSITE_OFFICIAL.md`](docs/P72_WEBSITE_OFFICIAL.md). [`docs/DOC_MAP.md`](docs/DOC_MAP.md), [`docs/UI_SURFACE_RULES.md`](docs/UI_SURFACE_RULES.md), [`docs/SURFACE_CLASSIFICATION.md`](docs/SURFACE_CLASSIFICATION.md) updated.

- **P71 (official desktop):** Electron + React app is the **only official native desktop** at [`desktop/`](desktop/); `torqa-desktop` runs [`src/torqa_desktop_launcher.py`](src/torqa_desktop_launcher.py) (auto `npm run build` if needed). Former Python Tk/pywebview package moved to [`desktop_legacy/`](desktop_legacy/) — `torqa-desktop-legacy` / `python -m desktop_legacy`. First-run **sample** actions in the Electron shell (minimal + flagship `.tq` copy + quick validate). Docs: [`docs/P71_DESKTOP_OFFICIAL.md`](docs/P71_DESKTOP_OFFICIAL.md); README, trial docs, `pyproject.toml` entrypoints, and tests updated.

- **P37 (trial readiness):** Canonical **first-trial** path documented in [`docs/TRIAL_READINESS.md`](docs/TRIAL_READINESS.md); [`torqa-flagship`](src/benchmarks/flagship_demo_cli.py) help text leads with numbered happy path + link to trial doc. **Website** (`/`) adds **Start here** and **What is TORQA?** nav anchors and a highlighted start section pointing at verify/build/console/proof. **Desktop** (`/desktop`) adds a welcome strip, **Load minimal IR (template)** (`examples/core/valid_minimal_flow.json` via API), and clearer sample labels. **Generated webapp** shell polish in [`src/codegen/artifact_builder.py`](src/codegen/artifact_builder.py) (header badge, footer, flow result on dashboard, refined CSS). Integration checks: [`tests/test_trial_readiness_p37.py`](tests/test_trial_readiness_p37.py). README and [`docs/FLAGSHIP_DEMO.md`](docs/FLAGSHIP_DEMO.md) link trial readiness; [`docs/DOC_MAP.md`](docs/DOC_MAP.md) indexed.

- **P36 (separate website vs desktop surfaces):** Product **website** at `GET /` (`webui/static/site/`) — hero, proof sections (compression, validation gate, flagship), docs/install, theme toggle; **web IR console** at `GET /console` (moved from `/`, `webui/static/console/`). **Desktop** webview UI redesigned as an **IDE-style** shell (explorer, editor tabs, tooling column, Output/Diagnostics panel, dark/light). Shared **`webui/static/shared/torqa-tokens.css`**. Spec: [`docs/UI_SURFACE_RULES.md`](docs/UI_SURFACE_RULES.md). Tests: [`tests/test_ui_surfaces_p36.py`](tests/test_ui_surfaces_p36.py); [`tests/test_webui.py`](tests/test_webui.py) updated for `/` vs `/console`.

- **P35 (public flagship demo package):** Single walkthrough [`docs/FLAGSHIP_DEMO.md`](docs/FLAGSHIP_DEMO.md) (what TORQA is, two core promises, stable commands, metrics, gate, web/desktop). Console script **`torqa-flagship`** prints the command index; **`torqa-flagship verify`** checks flagship assets, gate-proof expectations, baseline JSON, and a fresh compression benchmark run. [`README.md`](README.md) adds a concise **Public flagship demo** section and showcases the flagship row first. Integration tests: [`tests/test_flagship_demo_p35.py`](tests/test_flagship_demo_p35.py). [`examples/benchmark_flagship/README.md`](examples/benchmark_flagship/README.md) points to the new doc; [`docs/DOC_MAP.md`](docs/DOC_MAP.md) indexed.

### Documentation

- **P26 (self-host — safe domains):** Numeric merge/display caps parsed from ``sn_*_cap_<N>`` slugs ([`suggested_next_merge_cap_ir.py`](src/torqa_self/suggested_next_merge_cap_ir.py)); new [`cli_validate_open_hints.tq`](examples/torqa_self/cli_validate_open_hints.tq) + registry row for `torqa validate` open-file `suggested_next` lines ([`validate_open_hints_ir.py`](src/torqa_self/validate_open_hints_ir.py), [`src/cli/main.py`](src/cli/main.py)); fourth surface/project fail line via [`cli_surface_project_fail_suffix.tq`](examples/torqa_self/cli_surface_project_fail_suffix.tq). Python fallbacks unchanged when bundles are missing. Tests: [`tests/test_self_host_p26_parity.py`](tests/test_self_host_p26_parity.py). Docs: [`docs/SELF_HOST_MAP.md`](docs/SELF_HOST_MAP.md), [`examples/torqa_self/README.md`](examples/torqa_self/README.md).
- **P25 (first real website demo):** Flagship example [`examples/torqa_demo_site/app.tq`](examples/torqa_demo_site/app.tq) (sign-in + session + audit → full webapp + `server_stub.ts`); walkthrough [`docs/FIRST_REAL_DEMO.md`](docs/FIRST_REAL_DEMO.md); tests [`tests/test_first_real_demo.py`](tests/test_first_real_demo.py). Linked from [README.md](README.md), [docs/DOC_MAP.md](docs/DOC_MAP.md), [docs/QUICKSTART.md](docs/QUICKSTART.md).
- **P24 (Rust concentration — validation helper):** [`src/bridge/rust_structural_validation.py`](src/bridge/rust_structural_validation.py) exposes rust-core structural validation via the existing bridge ``validate_ir`` action; [`build_system_health_report`](src/diagnostics/system_health.py) includes ``rust_core.structural_validation``. Python ``validate_ir`` and the main pipeline stay unchanged. Notes in [`rust-core/src/ir/validate.rs`](rust-core/src/ir/validate.rs) / FFI. Tests: [`tests/test_rust_python_parity_targeted.py`](tests/test_rust_python_parity_targeted.py).
- **P23 (diagnostics explainability):** [`build_full_diagnostic_report`](src/diagnostics/report.py) and shape-error reports include a compact ``summary`` (validation flags, semantic counts, formal-phase tallies, code counts). JSON ``build``/``project`` adds ``pipeline_summary`` (parse/validate/project flags + validation digest). [`explain_ir_goal`](src/ir/explain.py) adds ``inventory``, ``weak_spots``, ``fix_next``; [`build_ir_quality_report`](src/ir/quality.py) adds ``summary``, ``weaknesses``, ``next_actions``. Helpers in [`src/diagnostics/summary.py`](src/diagnostics/summary.py). Tests: [`tests/test_diagnostics_quality.py`](tests/test_diagnostics_quality.py).
- **P22 (.tq authoring):** New compact templates under [`examples/torqa/templates/`](examples/torqa/templates/) (`minimal_form.tq`, `session_only.tq`, `guarded_session.tq`, `validation_rich_login.tq`); stricter `requires` / `flow:` parse checks and clearer `PX_TQ_*` messages in [`src/surface/parse_tq.py`](src/surface/parse_tq.py); hint entries in [`src/diagnostics/user_hints.py`](src/diagnostics/user_hints.py). Light updates to [`docs/QUICKSTART.md`](docs/QUICKSTART.md), [`docs/FIRST_PROJECT.md`](docs/FIRST_PROJECT.md), [`docs/TQ_AUTHOR_CHEATSHEET.md`](docs/TQ_AUTHOR_CHEATSHEET.md). Tests: [`tests/test_tq_authoring_examples.py`](tests/test_tq_authoring_examples.py); `tests/test_surface_tq.py` covers templates too.
- **P21 (webapp projection hardening):** [`src/codegen/artifact_builder.py`](src/codegen/artifact_builder.py) documents the stable webapp tree via `WEBAPP_CORE_RELATIVE_PATHS`, improves the Vite + React shell (section navigation, clearer copy, flow-named `index.html` / README), and drops internal-threshold wording from the demo README. Tests: [`tests/test_webapp_projection.py`](tests/test_webapp_projection.py).
- **P20 (projection contract):** [`src/projection/projection_contract.py`](src/projection/projection_contract.py) adds per-surface summaries (`target_language`, `purpose`, `file_count`, `top_level_paths`, `warnings`, `consistency_ok`); `materialize_project` attaches `projection_surfaces`; `torqa --json build`/`project` emit them. Human CLI unchanged. Tests: `tests/test_projection_contract.py`.
- **P19 (core pipeline hardening):** Explicit stages in [`src/project_materialize.py`](src/project_materialize.py) — `parse_stage`, `validate_stage`, `project_stage`; `materialize_project` delegates validate→project only. `torqa --json build` / `project` add optional `pipeline_stage` and `pipeline_stages` (parse/validate/project summaries). Re-exports in [`src/pipeline/__init__.py`](src/pipeline/__init__.py). Tests: `tests/test_pipeline_stages.py`. TODO markers for future Rust concentration in engine routing, diagnostics report, semantics, projection strategy.
- **P18 (TORQA-first positioning):** [docs/ARCHITECTURE_RULES.md](docs/ARCHITECTURE_RULES.md) states product identity (TORQA vs Rust/Python) and “next after P18” engineering focus; [docs/SURFACE_CLASSIFICATION.md](docs/SURFACE_CLASSIFICATION.md) classifies current repo paths. Linked from [README.md](README.md), [STATUS.md](STATUS.md), [docs/DOC_MAP.md](docs/DOC_MAP.md). Lightweight doc guard: `tests/test_product_identity_docs.py`.
- **P17.1 (self-host lockdown):** [src/torqa_self/bundle_registry.py](src/torqa_self/bundle_registry.py) documents a stability contract, `SELF_HOST_LOCKED_GROUP_IDS`, and runtime checks in `self_host_catalog()` (registry/meta length + known groups). See [docs/SELF_HOST_MAP.md](docs/SELF_HOST_MAP.md) §P17.1.
- **CLI ergonomics:** `python -m torqa …` now matches the `torqa` console script via a small `torqa/` package (`__main__` → `src.cli.main`), so Windows installs without `Scripts` on `PATH` still have a documented one-liner (see [docs/QUICKSTART.md](docs/QUICKSTART.md)).
- **P17 (productization):** [docs/SELF_HOST_MAP.md](docs/SELF_HOST_MAP.md) groups all self-host `.tq` areas (guidance, limits, ordering, language reference); [examples/torqa_self/README.md](examples/torqa_self/README.md) reorganized by group; [src/torqa_self/bundle_registry.py](src/torqa_self/bundle_registry.py) documents the same model and exposes `self_host_catalog()` + `SINGLE_FLOW_LINE`. CLI: `torqa --json language --self-host-catalog` for a machine-readable index (no new policy bundles).
- Adoption polish: canonical [docs/QUICKSTART.md](docs/QUICKSTART.md), [docs/FIRST_PROJECT.md](docs/FIRST_PROJECT.md), [docs/RELEASE_AND_VERSIONING.md](docs/RELEASE_AND_VERSIONING.md); README reorganized for first-time users; [STATUS.md](STATUS.md) and [DOC_MAP.md](docs/DOC_MAP.md) entry links.

### Self-host seed (Priority 11)

- [examples/torqa_self/cli_onboarding.tq](examples/torqa_self/cli_onboarding.tq) models default CLI onboarding hint order; [src/torqa_self/onboarding_ir.py](src/torqa_self/onboarding_ir.py) loads committed [examples/torqa_self/cli_onboarding_bundle.json](examples/torqa_self/cli_onboarding_bundle.json) for `onboarding_suggested_next_prefix()` in [src/diagnostics/user_hints.py](src/diagnostics/user_hints.py).
- **P11.1:** [examples/torqa_self/cli_surface_project_fail_suffix.tq](examples/torqa_self/cli_surface_project_fail_suffix.tq) models the three suffix lines for `suggested_next_for_surface_or_project_fail()`; [src/torqa_self/surface_fail_hints_ir.py](src/torqa_self/surface_fail_hints_ir.py) loads [examples/torqa_self/cli_surface_project_fail_suffix_bundle.json](examples/torqa_self/cli_surface_project_fail_suffix_bundle.json).
- **P11.2:** [examples/torqa_self/cli_report_suggested_next_order.tq](examples/torqa_self/cli_report_suggested_next_order.tq) models scan order for `suggested_next_from_report()` line slugs; [src/torqa_self/report_suggested_next_ir.py](src/torqa_self/report_suggested_next_ir.py) loads [examples/torqa_self/cli_report_suggested_next_order_bundle.json](examples/torqa_self/cli_report_suggested_next_order_bundle.json) (issue-code predicates remain in Python).

### Self-host layer (Priority 12)

- Central taxonomy: [examples/torqa_self/language_reference_taxonomy.tq](examples/torqa_self/language_reference_taxonomy.tq) drives six ordered lists in `language_reference_payload()` / `torqa language` via [src/torqa_self/language_reference_taxonomy_ir.py](src/torqa_self/language_reference_taxonomy_ir.py) (string values bridged in Python; builtins/registry unchanged).
- [src/torqa_self/bundle_io.py](src/torqa_self/bundle_io.py) and [src/torqa_self/bundle_registry.py](src/torqa_self/bundle_registry.py) consolidate bundle reads and the canonical list of `.tq` / bundle pairs; [scripts/validate_self_host_bundles.py](scripts/validate_self_host_bundles.py) + CI + `tests/test_torqa_self_bundle_drift.py` guard against drift.
- **P12.1:** [examples/torqa_self/layered_authoring_passes.tq](examples/torqa_self/layered_authoring_passes.tq) drives `layered_authoring_passes` in `language_reference_payload()` via [src/torqa_self/layered_authoring_passes_ir.py](src/torqa_self/layered_authoring_passes_ir.py) (registered for drift with the other self-host pairs).
- **P13:** TORQA-backed prefix for the first three `rules` lines in `language_reference_payload()` ([examples/torqa_self/language_reference_rules_prefix.tq](examples/torqa_self/language_reference_rules_prefix.tq) + [src/torqa_self/language_reference_rules_ir.py](src/torqa_self/language_reference_rules_ir.py)).
- **P13.1:** Prefix bundle grew to five lines (`policy_rule_unique_ids`, `policy_rule_aem_chain` moved from the former Python suffix).
- **P13.2:** All **seven** `rules` lines are TORQA-ordered via the same bundle (`policy_rule_diagnostics_full`, `policy_rule_multi_surface`); `_RULES_SUFFIX` removed — mapping + `_FALLBACK_PREFIX` only.

### Self-host expansion (Priority 14)

- [examples/torqa_self/language_reference_condition_patterns.tq](examples/torqa_self/language_reference_condition_patterns.tq) drives `language_reference_payload.condition_id_patterns` (slug order → dict insertion order; pattern strings mapped in [src/torqa_self/language_reference_condition_patterns_ir.py](src/torqa_self/language_reference_condition_patterns_ir.py)).
- **P14.1:** [examples/torqa_self/language_reference_prose_refs.tq](examples/torqa_self/language_reference_prose_refs.tq) supplies `diagnostics_issue_shape` and `aem_execution` via [src/torqa_self/language_reference_prose_refs_ir.py](src/torqa_self/language_reference_prose_refs_ir.py) (slug identity → payload field; prose in Python).

### Behavior-level self-host (Priority 15)

- [examples/torqa_self/cli_suggested_next_merge_cap.tq](examples/torqa_self/cli_suggested_next_merge_cap.tq) selects the max length for deduped CLI/web `suggested_next` merges via [src/torqa_self/suggested_next_merge_cap_ir.py](src/torqa_self/suggested_next_merge_cap_ir.py) (`sn_merge_cap_*` → int; default bundle `sn_merge_cap_10`). Which hints appear is unchanged; only the list cap is policy-driven.
- **P15.1:** Same bundle adds `sn_display_cap_*` (4 / 6 / 8) for how many `suggested_next` lines print under human `torqa surface` stderr **Next:** after a `.tq` parse error (default `sn_display_cap_6`, matching the former hardcoded slice). JSON `suggested_next` arrays are unchanged.
- **P16 (decision-layer self-host):** [examples/torqa_self/cli_suggested_next_merge_order.tq](examples/torqa_self/cli_suggested_next_merge_order.tq) selects whether the onboarding prefix is merged **before** or **after** context-specific lines (`sn_merge_order_onboarding_first` vs `sn_merge_order_context_first`) via [src/torqa_self/suggested_next_merge_order_ir.py](src/torqa_self/suggested_next_merge_order_ir.py). Python still builds prefix and `rest` and dedupes; only block order is policy.
- **P16.1:** Same bundle adds `sn_secondary_report_order_scan` vs `sn_secondary_report_order_surface_first`: among lines selected by `suggested_next_from_report` only, if both sem and surface hints appear with sem before surface, policy can move the surface line immediately before the sem line. Issue predicates and primary slug scan order are unchanged; fallback is scan-order (legacy).

## [1.0.0] - 2026-04-02

First **production semver** aligned with [`docs/TORQA_VISION_NORTH_STAR.md`](docs/TORQA_VISION_NORTH_STAR.md) §7: green CI (`pytest`, Rust, Vite smoke), single CLI + `src/torqa_public.py` entry surface, `torqa project` / materialize + zip API, `docs/PACKAGE_SPLIT.md` core API, `CHANGELOG` + README discipline, and a minimal `packages/js/torqa-types` stub for future `@torqa/*` publishing.

### Added

- **Packages:** `packages/js/torqa-types/` placeholder `package.json` + README (schema path from monorepo root).

### Changed

- Package version **1.0.0** (IR versioning remains per [`docs/IR_VERSIONING.md`](docs/IR_VERSIONING.md)).

## [0.1.0] - 2026-04-02

### Added

- **F1 / F2 roadmap:** `torqa project` supports `--root`, `--source`, `.tq`/`.pxir` sources; JSON summary includes `written` and `errors`; shared `src/project_materialize.py` and `src/torqa_public.py`.
- **F3:** Web API `POST /api/materialize-project-zip` (zip download, no server path arguments).
- **F4:** Maintainer verify doc, codegen inventory, package split doc, web security doc, path sanitization for artifact names.
- **F5:** `examples/packages/demo_lib/` sample + consuming bundle test; preview-package template doc.
- **Workspace example:** `examples/workspace_minimal/` with two-command README.

### Changed

- Package version set to **0.1.0** (initial “shaped release” marker alongside IR 1.4).

