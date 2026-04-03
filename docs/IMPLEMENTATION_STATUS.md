# Implementation status (English)

This file summarizes what is **implemented** versus **roadmap** for the current tree.

## Implemented

- **Canonical IR** (`src/ir/canonical_ir.py`): serialization, normalization, fingerprint, structural + handoff validation.
- **Semantic layer** (Python + Rust): symbol and guarantee checks; Rust-preferred execution with Python fallback (`src/execution/engine_routing.py`).
- **Orchestrator**: projection planning, artifact generation, V4 maintenance pass (`SystemOrchestrator.run_v4`).
- **Projections**: Vite/React website skeleton from IR; **non-website targets** emit **IR-derived** Rust, Python, SQL, TypeScript, Go, and C++ text (not empty TODO stubs).
- **Golden examples** under `examples/core/` validated by **pytest** and **JSON Schema** (`spec/IR_BUNDLE.schema.json`).
- **Web console** (`webui/`): load examples, edit JSON, run validation / engine / orchestrator, preview artifacts.
- **CI** (`.github/workflows/ci.yml`): Python tests + Rust tests on Ubuntu.

## Partial / transitional

- **Legacy `CoreGoal` path** in `kural_parser.py` remains for migration; IR-native paths are canonical.
- **Rust toolchain** on developer machines: optional; Python fallback applies when the bridge fails.
- **Self-hosting / evolution modules** still contain placeholder artifacts compared to the main codegen path.

## Recently added (foundation)

- **Stable diagnostic codes** and a unified report: `src/diagnostics/` (`build_full_diagnostic_report`).
- **AI suggest path** (optional `OPENAI_API_KEY`, OpenAI HTTP API + verifier repair loop): `src/ai/adapter.py`, `/api/ai/suggest`, CLI `ai-suggest`.
- **Controlled IR patches** via JSON mutations: `src/control/ir_mutation_json.py`, `/api/ir/patch`, CLI `patch`.
- **CLI** `torqa` / `python -m torqa` / `python -m src.cli.main`: primary **`build`** and **`project`**; **`surface`** (`.tq`/`.pxir`→JSON); **`validate`** / **`diagnostics`** (bundle `.json` only); **`demo`** (index / `verify` / `emit`); plus `run`, `guided`, `explain`, `quality`, `strategy`, `ai-suggest`, `patch`, `preview-patch`, `check`, `bundle-lint`, … (+ global **`--json`** before the subcommand).
- **Web UI**: rate limiting, Monaco, `/api/quality`, `/api/explain`, `/api/strategy`, `/api/preview-patch`, `/api/system-health`.
- **Platform reports**: `build_ir_quality_report`, `explain_ir_goal`, `explain_projection_strategy`, `build_generation_quality_report`, `build_patch_preview_report`, `build_system_health_report`, `build_engine_parity_report`, `build_semantic_fix_suggestions`.
- **Rust bridge timeout**: `TORQA_RUST_TIMEOUT_SEC` (default 120s).
- **Docs index**: `docs/DOC_MAP.md`, `docs/ARCHITECTURE_STATUS.md`, `docs/WEBUI_AND_CLI_SURFACES.md`, `STATUS.md`, `ROADMAP.md`. (Historical upgrade list: `docs/archive/precursor_and_plans/UPGRADE_REPORT.md`.)

## Not claimed as complete

- Full multi-domain projection fidelity (e.g. production-grade SQL migrations, real auth servers).
- Hardened **AI** layer (key rotation, org billing, prompt injection defenses beyond basic JSON mode).
- Full **round-trip** from arbitrary generated source files back into IR (only structured mutations are supported here).
- **Distributed** rate limiting, SSO, and production observability stack.
