# Known failure modes

This page lists **expected** ways TORQA can fail or reject work — by design or by environment — so you can tell “bug” from “contract.” It is not an exhaustive code list; see linked docs and `src/diagnostics/codes.py` for identifiers.

---

## CLI and environment

| Symptom | Typical cause | What to do |
|--------|----------------|------------|
| `torqa` / `torqa-console` / `torqa-desktop` not found (Windows) | Console scripts live under Python’s `Scripts` folder, not on `PATH` | From repo root: `python -m torqa …`, `python -m webui`, `python -m desktop_legacy --tk` — see [QUICKSTART.md](QUICKSTART.md), [DEMO_LOCALHOST.md](DEMO_LOCALHOST.md) |
| `unrecognized arguments: --json` after a subcommand | Global `--json` must come **before** the subcommand | Use `torqa --json surface FILE.tq`, not `torqa surface FILE.tq --json` — see [WEBUI_AND_CLI_SURFACES.md](WEBUI_AND_CLI_SURFACES.md), [MAINTAINER_VERIFY.md](MAINTAINER_VERIFY.md) |
| `torqa validate` fails on a `.tq` file | `validate` / `diagnostics` accept **IR bundle `.json` only** | Use `torqa surface …` or `torqa build` / `torqa project` for `.tq`; or compile in the web console first |
| Non-zero exit from `torqa build` / `project` | Parse, envelope, IR shape, semantics, or materialize stage failed | Run `torqa --json project …` and inspect `pipeline_stages` / diagnostics; fix IR or surface, then retry — [VALIDATION_GATE.md](VALIDATION_GATE.md) |

---

## `.tq` surface parse errors (`PX_TQ_*`)

Parse failures **do not** produce an IR bundle until the surface is fixed.

| Area | Examples | Detail |
|------|-----------|--------|
| Header order / duplicates | `PX_TQ_HEADER_ORDER`, `PX_TQ_DUPLICATE_HEADER`, `PX_TQ_MISSING_RESULT` | [TQ_SURFACE_MAPPING.md](TQ_SURFACE_MAPPING.md) |
| `flow:` body | `PX_TQ_FLOW_INDENT`, `PX_TQ_FLOW_BLANK_LINE`, `PX_TQ_UNKNOWN_FLOW_STEP`, `PX_TQ_LEGACY_FLOW_STEP` | Same |
| Conditional emit | `PX_TQ_WHEN_*` | Same |
| `include` | `PX_TQ_INCLUDE_NEEDS_PATH`, `PX_TQ_INCLUDE_DUPLICATE` | Resolver needs a real file path (CLI provides it) |
| Unsupported syntax | `PX_TQ_UNLESS_UNSUPPORTED`, etc. | [TORQA_MAJOR_WORK_PROMPTS.md](TORQA_MAJOR_WORK_PROMPTS.md) (migration notes) |

CLI / API responses often include **`suggested_next`** lines and optional **hints** for the exact fix path.

---

## IR structural and semantic validation (`PX_IR_*`, `PX_SEM_*`, `PX_HANDOFF`)

After JSON exists (from surface compile or hand-authored):

- **Structural (`PX_IR_*`):** goal, inputs, condition IDs, transitions, metadata, canonical ordering, etc.
- **Handoff (`PX_HANDOFF`):** ASCII / operator constraints on IR text.
- **Semantic (`PX_SEM_*`):** unknown functions/effects, arity/types, undefined identifiers, forbid/guarantee/transition issues.

Full diagnostics: `torqa validate bundle.json` or **Full diagnostics** in `/console`. Reports use formal **phases** (e.g. structural, semantic) — see [VALIDATION_GATE.md](VALIDATION_GATE.md).

---

## Build, project, and materialize

| Symptom | Meaning |
|---------|--------|
| Validation fails | No clean accept; projection must not run as success — [VALIDATION_GATE.md](VALIDATION_GATE.md) |
| `written` empty or CLI exit ≠ 0 | Treat as **rejected** even if a partial tree exists on disk for inspection |
| ZIP download fails in web UI | Invalid bundle, engine error, or rate limit — banner / JSON body; no silent accept — [DEMO_SURFACES.md](DEMO_SURFACES.md) |

**Note:** `POST /api/materialize-project` (write to arbitrary server path) is **not** implemented by design — [WEBUI_SECURITY.md](WEBUI_SECURITY.md).

---

## Web UI and API

| Symptom | Typical cause |
|---------|----------------|
| AI suggest always fails | `OPENAI_API_KEY` unset on the **server process** — codes such as `PX_AI_NO_KEY`, `PX_AI_HTTP`, `PX_AI_JSON`, `PX_AI_MAX_RETRIES` |
| `/api/*` errors on malformed JSON | HTTP 4xx; body explains parse or shape errors |
| Heavy or abusive traffic | Rate limiting on selected routes — [WEBUI_SECURITY.md](WEBUI_SECURITY.md) |

Local preview only: do not expose the dev server to untrusted networks without hardening — see [TRIAL_READINESS.md](TRIAL_READINESS.md), [WEBUI_SECURITY.md](WEBUI_SECURITY.md).

---

## Desktop (native / Tk)

| Symptom | Typical cause |
|---------|----------------|
| No embedded window on Windows | `pywebview` / `pythonnet` not installed or not supported for your Python — use `python -m desktop_legacy --tk` — [DEMO_LOCALHOST.md](DEMO_LOCALHOST.md), `pyproject.toml` optional deps |
| Folder pick / disk write unavailable in browser | PyWebview **API** not present; use native desktop or Tk for workspace selection |

---

## IR mutations and patch preview

| Code | Meaning |
|------|---------|
| `PX_MUTATION_UNSUPPORTED` | Mutation not supported for this IR shape |
| `PX_MUTATION_INVALID` | Mutation JSON invalid or inconsistent |
| `PX_MUTATION_BATCH` | Batch-level rejection |

---

## Flagship demo, gate proof, and compression baseline

| Symptom | Typical cause |
|---------|----------------|
| `torqa demo verify` ≠ 0 | Missing flagship files, gate expectation mismatch, or **compression baseline drift** vs a fresh benchmark run |
| `torqa-gate-proof` shows `mismatch_with_expectation` ≠ 0 | Fixture or engine behavior changed vs manifest — [VALIDATION_GATE.md](VALIDATION_GATE.md) |
| `torqa-compression-bench` disagrees with checked-in JSON | Regenerate baseline intentionally with `--write` — [BENCHMARK_COMPRESSION.md](BENCHMARK_COMPRESSION.md) |

---

## Engine (Rust vs Python)

If the Rust path errors or times out, the stack may fall back to Python depending on **`--engine-mode`** and environment (e.g. `TORQA_RUST_TIMEOUT_SEC`) — see [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md), `src/execution/engine_routing.py`.

---

## JSON Schema and envelope

| Symptom | Typical cause |
|---------|----------------|
| `PX_SCHEMA_INVALID` | Bundle fails JSON Schema / envelope rules before full IR validation |
| `PX_PARSE_FAILED` | Generic parse or shape failure (includes bad file type for command) |

---

## Related docs

| Doc | Use when |
|-----|----------|
| [QUICKSTART.md](QUICKSTART.md) | First install and PATH |
| [VALIDATION_GATE.md](VALIDATION_GATE.md) | Accept vs reject semantics |
| [TQ_SURFACE_MAPPING.md](TQ_SURFACE_MAPPING.md) | `.tq` rules and `PX_TQ_*` |
| [WEBUI_SECURITY.md](WEBUI_SECURITY.md) | API boundaries and zip design |
| [DEMO_LOCALHOST.md](DEMO_LOCALHOST.md) | Desktop / Node / Windows |
| [TRIAL_READINESS.md](TRIAL_READINESS.md) | What “trial ready” does and does not promise |
| [DEPRECATION_MAP.md](DEPRECATION_MAP.md) | Removed or renamed paths (if present) |

Stable codes: `src/diagnostics/codes.py`. Regression guards for CLI/API contracts: `tests/test_regression_no_drift.py`.
