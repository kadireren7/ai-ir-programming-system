# Public flagship demo (P35)

**Trial framing (P37):** what is ready, what is limited, and the best first run — [`TRIAL_READINESS.md`](TRIAL_READINESS.md).

This is the **single walkthrough** for TORQA’s first **public-quality** demo package: one benchmark-shaped product flow, two explicit product promises, and the same commands a visitor can run from a clean clone.

---

## What TORQA is (in one paragraph)

**TORQA** is a semantic-first way to describe system behavior: you write a small, checkable **surface** (`.tq`) that compiles to canonical **IR**, passes **validation** (envelope, shape, semantics), and **projects** to real artifacts (Vite/React webapp, SQL, language stubs). The IR and diagnostics are the contract; generated files are outputs, not the source of truth.

---

## What this demo proves

| Promise | How this demo shows it |
|--------|-------------------------|
| **1 · Semantic compression** | A short `.tq` plus IR carries the same intent as a longer natural-language task spec (`BENCHMARK_TASK.md`). Metrics quantify **task vs surface** and **surface vs generated** scale (see P32). |
| **2 · Hard validation gate** | Invalid bundles never complete a clean accept path: parse and validate stop bad input before projection. The **gate proof** manifest encodes expected reject stages (P33). |

Together with **generated/webapp** and the **Web/Desktop** consoles, this is the “real system” story—not an internal language sketch.

---

## What ships in the repo

| Path | Role |
|------|------|
| [`examples/benchmark_flagship/app.tq`](../examples/benchmark_flagship/app.tq) | Canonical benchmark **surface** (login + dashboard shell). |
| [`examples/benchmark_flagship/BENCHMARK_TASK.md`](../examples/benchmark_flagship/BENCHMARK_TASK.md) | NL comparator task (for token comparison). |
| [`examples/benchmark_flagship/expected_output_summary.json`](../examples/benchmark_flagship/expected_output_summary.json) | Machine checklist of expected generated paths. |
| [`examples/benchmark_flagship/compression_baseline_report.json`](../examples/benchmark_flagship/compression_baseline_report.json) | Checked-in **P32** metric snapshot. |
| [`examples/benchmark_flagship/gate_invalid/`](../examples/benchmark_flagship/gate_invalid/) | Intentionally broken fixtures + **manifest** for gate proof. |

---

## How to run it (stable commands)

From the **repository root** after `pip install -e .`, run **`torqa demo` first** — it prints the full trial command list in order (same text as legacy `torqa-flagship`). The table below is a static reference for the same steps:

| Step | Command |
|------|---------|
| **Demo path (print steps)** | `torqa demo` (single entry; same text as legacy `torqa-flagship`) |
| **End-to-end build** | `torqa build examples/benchmark_flagship/app.tq` |
| **Gate proof report** | `torqa-gate-proof` |
| **Compression bench** (regenerate baseline) | `torqa-compression-bench examples/benchmark_flagship --repo-root . --write examples/benchmark_flagship/compression_baseline_report.json` |
| **Web** | `torqa-console` → **`/`** product site, **`/console`** IR lab (default [http://127.0.0.1:8000/](http://127.0.0.1:8000/)) |
| **Desktop** | **`torqa-desktop`** (official Electron) · legacy: `torqa-desktop-legacy` / `python -m desktop_legacy --tk` |
| **CI-style sanity** | `torqa demo verify` |

If `torqa` is not on `PATH`: use `python -m torqa …` (recommended) or `python -m src.cli.main …` — same entrypoint as the `torqa` script.

**Generated output:** `torqa build` writes under `./generated_out/` by default (see `torqa build --help` for `--root` / `--out`). For a local Vite dev server, see [DEMO_LOCALHOST.md](DEMO_LOCALHOST.md).

---

## How to inspect token / compression metrics

1. **Checked-in baseline:** open [`examples/benchmark_flagship/compression_baseline_report.json`](../examples/benchmark_flagship/compression_baseline_report.json). Key fields under `metrics`: `task_prompt_token_estimate`, `torqa_source_token_estimate`, `semantic_compression_ratio`, `generated_output_token_estimate`, etc.
2. **Regenerate:** run the `torqa-compression-bench … --write …` command above (may materialize to a temp dir to measure generated webapp unless you pass `--no-generated` or `--materialize-root`).
3. **Concepts:** [BENCHMARK_COMPRESSION.md](BENCHMARK_COMPRESSION.md) · baseline context: [BENCHMARK_FLAGSHIP.md](BENCHMARK_FLAGSHIP.md).

---

## How to inspect validation-gate behavior

1. **Automated proof:** `torqa-gate-proof` prints JSON with `summary.accepted` / `rejected`, `rejections_by_stage`, and per-case rows. Expect **`mismatch_with_expectation`: 0** on a clean tree.
2. **Fixtures:** under `examples/benchmark_flagship/gate_invalid/` (do not use as templates).
3. **Theory:** [VALIDATION_GATE.md](VALIDATION_GATE.md).

---

## How to launch the Web UI

```bash
torqa-console
# or
python -m webui
```

- **`/`** — Product website preview (hero, proof sections, docs links). See [UI_SURFACE_RULES.md](UI_SURFACE_RULES.md).
- **`/console`** — Browser IR lab: **sidebar · Flagship demo**, Monaco, diagnostics, ZIP. **P32/P33** summaries load from `/api/demo/*` (see [DEMO_SURFACES.md](DEMO_SURFACES.md)).

---

## How to launch the Desktop UI

```bash
torqa-desktop
```

Official app: Electron under `desktop/` (see [desktop/README.md](../desktop/README.md); run `npm install` in `desktop/` once). Legacy Tk / webview: `torqa-desktop-legacy` or `python -m desktop_legacy --tk`. Browser IDE: `torqa-console` → `/desktop`.

---

## Deeper references

| Doc | Topic |
|-----|--------|
| [QUICKSTART.md](QUICKSTART.md) | Install + first success |
| [FIRST_REAL_DEMO.md](FIRST_REAL_DEMO.md) | Alternate website walkthrough (`torqa_demo_site`) |
| [BENCHMARK_FLAGSHIP.md](BENCHMARK_FLAGSHIP.md) | Benchmark design (P31) |
| [VALIDATION_GATE.md](VALIDATION_GATE.md) | Validation gate (P33) |
| [DEMO_SURFACES.md](DEMO_SURFACES.md) | Web + Desktop surfaces (P34) |
| [WEBUI_SECURITY.md](WEBUI_SECURITY.md) | Local-only / zip security notes |

---

## One-liner credibility check

```bash
torqa demo verify && torqa-gate-proof | head -c 200
```

(`head` optional; omits on Windows PowerShell—run `torqa-gate-proof` alone to view full JSON.)
