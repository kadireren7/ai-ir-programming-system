# Benchmark flagship (P31)

**Public walkthrough (commands, UI, metrics, gate):** [FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md) · `torqa demo`.

## What this is

**`examples/benchmark_flagship/app.tq`** is the **first canonical, benchmarkable TORQA demo** intended for **P32–P35** comparisons. It encodes a **real product-shaped** flow:

- **Login + dashboard shell:** member sign-in with `username`, `password`, `ip_address`; `forbid locked`; `ensures session.created`; session + audit transitions (`create session`, `emit login_success`).
- **Human-facing result line:** `Welcome back` (shows up in generated webapp title/shell).
- **Generated output:** full **Vite + React** tree under `generated/webapp/` (same projection pipeline as other flagship demos).

It is **small** (one `.tq` file, tens of lines) but **not** a syntax toy: it exercises guards, postconditions, and multi-step effects that drive richer projection.

## Why it is the baseline

TORQA’s two promises for public comparison are:

1. **Same software intent with far fewer tokens** than typical prompt → code workflows.
2. **Invalid intent does not enter the system** — parse and validation gates stop bad specs before materialization.

This demo is the **fixed reference** for (1): pair it with **`examples/benchmark_flagship/BENCHMARK_TASK.md`** (natural-language task of equivalent intent) and measure tokens/lines for TORQA vs baselines. For (2), see **[`docs/VALIDATION_GATE.md`](VALIDATION_GATE.md)** and the proof fixtures under **`examples/benchmark_flagship/gate_invalid/`** (`torqa-gate-proof`, tests in `tests/test_gate_proof_p33.py`). Invalid `.tq` or invalid IR does not complete a successful materialize path (no `written` files when validation fails).

## Relation to other demos

| Path | Role |
|------|------|
| [`examples/torqa_demo_site/app.tq`](../examples/torqa_demo_site/app.tq) | **Walkthrough** demo — [`FIRST_REAL_DEMO.md`](FIRST_REAL_DEMO.md) |
| **`examples/benchmark_flagship/app.tq`** | **Measurement** baseline — stable paths + fixtures for CI/benchmarks |

The IR shape is intentionally aligned with the website demo (sign-in + audit + session); the benchmark copy uses a distinct **module/intent/result** so reports and tooling can key off `LoginDashboardShell` and `p31_login_dashboard_shell_v1`.

## Fixtures

| File | Purpose |
|------|---------|
| `BENCHMARK_TASK.md` | Stable task description for non-TORQA codegen runs |
| `expected_output_summary.json` | Machine-readable list of required generated paths |
| `compression_baseline_report.json` | P32 token-estimate metrics + ratios (regenerate via [BENCHMARK_COMPRESSION.md](BENCHMARK_COMPRESSION.md)) |

## Desktop / Web UI

- **CLI:** `torqa build examples/benchmark_flagship/app.tq` (or `project` with `--root` / `--out`).
- **Desktop (legacy):** same IR bundle as CLI — `desktop_legacy.workspace_io.materialize_bundle_to_workspace` accepts the parsed bundle JSON and writes under `<workspace>/generated_out` (see tests).

## Related

- [TORQA_DOMINANCE.md](TORQA_DOMINANCE.md) — architecture snapshot (P30)
- [FIRST_REAL_DEMO.md](FIRST_REAL_DEMO.md) — step-by-step website demo (P25)
