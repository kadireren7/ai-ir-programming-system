# Supported scope

This document defines **what TORQA supports today** in the repository: authoring surfaces, tooling, validation behavior, projections, and trial-ready paths. It complements [TRIAL_READINESS.md](TRIAL_READINESS.md) (first-trial contract) and [USE_CASES.md](USE_CASES.md) (fit / non-fit narratives).

TORQA is **semantic-first** and **developer-focused**: checkable IR, diagnostics, and codegen — not a full application platform or arbitrary “generate any website from prose” product.

---

## Authoring surfaces (supported)

| Surface | Status | Notes |
|---------|--------|--------|
| **`.tq` (tq_v1)** | **Supported** for the grammar and examples in-repo | Parse → IR via `torqa surface`, `torqa build` / `torqa project`, and web **Compile .tq → IR**. Rules: [TQ_SURFACE_MAPPING.md](TQ_SURFACE_MAPPING.md), [TQ_AUTHOR_CHEATSHEET.md](TQ_AUTHOR_CHEATSHEET.md). |
| **IR bundle JSON** | **Supported** (canonical contract) | Envelope + `ir_goal`; schema: `spec/IR_BUNDLE.schema.json`. Validate with `torqa validate` / `diagnostics`; drives build, run, web APIs. |
| **`.pxir`** | **Transitional** | Subset / legacy path; still compilable where wired — [SURFACE_CLASSIFICATION.md](SURFACE_CLASSIFICATION.md). |

Unsupported as *primary* input for `validate`: raw `.tq` / `.pxir` (CLI directs users to `surface` or `project`).

---

## Tooling (supported)

| Tool | Role |
|------|------|
| **`torqa`** / **`python -m torqa`** | Primary CLI: `build`, `project`, `surface`, `validate`, `diagnostics`, `run`, `guided`, `demo` (+ `verify` / `emit`), packages, patch, `check`, … — [WEBUI_AND_CLI_SURFACES.md](WEBUI_AND_CLI_SURFACES.md), [QUICKSTART.md](QUICKSTART.md). |
| **`torqa-console`** / **`python -m website.server`** | Local web: marketing site `/` + JSON APIs; `/console` → `/`; `/desktop` → desktop pointer. |
| **`torqa-desktop`** | Official native shell (Electron in `desktop/`; launches `torqa` CLI subprocesses). |
| **`src/workspace_bundle_io.py`** | Materialize / flow scaffold helpers (tests, tooling; not a UI surface). |
| **Benchmark / gate CLIs** | `torqa-compression-bench`, `torqa-gate-proof`, `torqa-flagship` (legacy alias for `torqa demo` text / verify). |

---

## Validation and semantics (supported)

- **Envelope** and **JSON Schema** checks on bundles.
- **Structural IR** validation (shape, IDs, ordering, handoff constraints).
- **Semantic** report over the default function/effect registry (errors block; warnings attach per policy).
- **Hard gate:** invalid input does **not** complete a clean accept path for materialize — [VALIDATION_GATE.md](VALIDATION_GATE.md).
- **Diagnostics** with stable **`PX_*`** codes and formal phases — `src/diagnostics/codes.py`, [FAILURE_MODES.md](FAILURE_MODES.md).

---

## Projections and outputs (supported)

From a **validated** IR goal, the pipeline can materialize (subject to IR shape and projection rules):

- **Webapp-shaped tree** (e.g. Vite + React **preview** under `generated/webapp/` in typical demos) — layout and flow copy, not a full design system.
- **SQL-shaped** artifacts (e.g. schema-style output under `generated/sql/`).
- **Language stubs** (Rust, Python, TypeScript, Go, Kotlin, C++, …) per projection configuration.
- **Stable ordering** of generated paths for regression-style checks — see [USE_CASES.md](USE_CASES.md), `src/project_materialize.py`.

**Not supported as a product promise:** pixel-perfect production UI, real auth backends, or CMS replacement — see [TRIAL_READINESS.md](TRIAL_READINESS.md) “intentionally limited.”

---

## Workflow shapes (supported well today)

- **Intent-first flows:** `intent`, `requires`, `result`, small **`flow:`** with guarded steps — especially **login / session-shaped** demos — [TRIAL_READINESS.md](TRIAL_READINESS.md), templates under `examples/torqa/templates/`.
- **Multi-surface output** from one IR (web + SQL + stubs) after validation.
- **IR packages / compose** — [USING_PACKAGES.md](USING_PACKAGES.md), `examples/package_demo/`.
- **Optional AI suggest** with validation / proposal gate paths (requires `OPENAI_API_KEY` where applicable) — not required for core TORQA use.

---

## Canonical trial package (supported)

The repo defines a **single flagship first-trial path** (metrics, gate, generated web tree, UIs):

- Entry: **`torqa demo`** → follow printed steps; verify: **`torqa demo verify`**; benchmark summary: **`torqa demo benchmark`**; build: **`torqa build examples/benchmark_flagship/app.tq`** — [FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md), [TRIAL_READINESS.md](TRIAL_READINESS.md), bundled index: [`examples/trial_ready/README.md`](../examples/trial_ready/README.md).

---

## Out of scope (not supported here)

| Area | Expectation |
|------|-------------|
| **General-purpose marketing sites / large arbitrary SPAs** | Out of scope for current projection emphasis — [TRIAL_READINESS.md](TRIAL_READINESS.md). |
| **Hosted SaaS, multi-tenant product, enterprise IAM** | Not provided by this repo. |
| **100% NL → production app without a checkable spec** | Contradicts the semantic-first model — [USE_CASES.md](USE_CASES.md). |
| **Server-side write to arbitrary paths from web UI** | ZIP download and local CLI/project flows; see [WEBUI_SECURITY.md](WEBUI_SECURITY.md). |
| **Guaranteed Rust on every developer machine** | Optional; Python fallback exists — [STATUS.md](../STATUS.md). |

---

## IR version and contracts

- **Canonical IR** revision is tracked in tooling (`canonical_ir_version` in health/API) and bundle `metadata.ir_version` (e.g. **1.4** in current examples).
- Normative bundle rules: **`spec/IR_BUNDLE.schema.json`**, [CORE_SPEC.md](CORE_SPEC.md).

---

## Classification of repo content

Which folders are “product” vs implementation support: [SURFACE_CLASSIFICATION.md](SURFACE_CLASSIFICATION.md). Architecture rules: [ARCHITECTURE_RULES.md](ARCHITECTURE_RULES.md).

---

## Related docs

| Doc | Role |
|-----|------|
| [README.md](../README.md) | Positioning and entry links |
| [STATUS.md](../STATUS.md) | Maturity snapshot |
| [TRIAL_READINESS.md](TRIAL_READINESS.md) | First-trial expectations |
| [USE_CASES.md](USE_CASES.md) | Strong vs weak fits |
| [FAILURE_MODES.md](FAILURE_MODES.md) | How things fail by design |
| [DOC_MAP.md](DOC_MAP.md) | Full index |
