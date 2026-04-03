# Core proof summary

This page **combines the flagship evidence** the repo already ships: **token estimates**, the **validation gate proof**, and **retry behavior** on the AI suggestion path. It answers two questions directly, then shows the numbers and how to reproduce them.

---

## Does TORQA reduce token usage?

**Yes — on the canonical flagship benchmark, measured intent is carried in far fewer tokens in the TORQA surface than in the paired natural-language task spec.**

| Metric (estimator: `utf8_bytes_div_4_v1`) | Tokens (approx.) |
|---------------------------------------------|-----------------:|
| NL task prompt (`BENCHMARK_TASK.md`) | **484** |
| TORQA surface (`.tq` source) | **163** |
| **Semantic compression ratio** (task ÷ surface) | **≈ 2.97×** |
| IR bundle JSON (estimate) | **489** |
| Generated output (measured tree, estimate) | **1,460** |

**Source of truth:** checked-in report [`examples/benchmark_flagship/compression_baseline_report.json`](../examples/benchmark_flagship/compression_baseline_report.json) (`benchmark_id`: `p31_login_dashboard_shell_v1`). Definitions of the ratios are in that file’s `notes` array.

**Caveat:** This is **one** benchmark-shaped demo (login + dashboard shell), not a claim about every possible workflow. See [`BENCHMARK_COMPRESSION.md`](BENCHMARK_COMPRESSION.md) for methodology and limitations.

---

## Does the validation gate work?

**Yes — the gate proof manifest expects specific accept/reject outcomes per case; a full run reports zero mismatches with those expectations.**

Latest shape from `torqa-gate-proof` against [`examples/benchmark_flagship/gate_invalid/manifest.json`](../examples/benchmark_flagship/gate_invalid/manifest.json):

| Summary field | Value |
|---------------|------:|
| Total cases | 10 |
| Accepted (expected valid path) | 1 |
| Rejected (expected invalid fixtures) | 9 |
| Rejections at **parse** | 2 |
| Rejections at **validate** | 7 |
| Rejections at **project** | 0 |
| **Mismatch with expectation** | **0** |

So: **invalid bundles are stopped** at the documented stages; the **valid flagship `.tq`** is **accepted**; and the harness agrees with the manifest on every row.

**Caveat:** “Gate works” here means **the staged pipeline and the proof fixtures behave as specified** — not that every possible bad input in the wild has a fixture yet. See [`VALIDATION_GATE.md`](VALIDATION_GATE.md).

---

## Retry stats (AI IR suggestion path)

There is **no checked-in aggregate “retry report”** for the whole product. Retry behavior is **bounded and explicit** on the **optional** OpenAI IR suggestion API:

- **Default:** up to **`max_retries + 1` attempts** (default `max_retries = 3` → **4** generations maximum) before returning failure with code for max retries exceeded.
- Each attempt can record **parse / schema / IR / diagnostic** feedback in an **`attempts`** list on the response (for tooling and UI), but **counts are per call**, not fleet-wide telemetry.

**Reproduce / inspect:** implementation in [`src/ai/adapter.py`](../src/ai/adapter.py) (`suggest_ir_bundle_from_prompt`). Without `OPENAI_API_KEY`, the path returns immediately with **no** model retries.

---

## How to reproduce locally

```bash
# Token snapshot (regenerates vs working tree; may update JSON if you pass --write)
torqa-compression-bench examples/benchmark_flagship --repo-root .

# Gate proof (JSON on stdout)
torqa-gate-proof

# One-shot sanity (assets + gate expectations + baseline shape + fresh bench)
torqa demo verify
```

---

## Related docs

| Doc | Role |
|-----|------|
| [`BENCHMARK_COMPRESSION.md`](BENCHMARK_COMPRESSION.md) | Token metrics methodology |
| [`VALIDATION_GATE.md`](VALIDATION_GATE.md) | Gate semantics and fixtures |
| [`FLAGSHIP_DEMO.md`](FLAGSHIP_DEMO.md) | End-to-end flagship walkthrough |
| [`CORE_POSITIONING.md`](CORE_POSITIONING.md) | What TORQA is (product identity) |
