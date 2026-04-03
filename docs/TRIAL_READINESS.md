# Trial readiness (P37)

TORQA can **generate and demonstrate a first real website-style system** with **benchmarked semantic compression** and a **hard validation gate** — on the **canonical flagship path** documented here and in [`FLAGSHIP_DEMO.md`](FLAGSHIP_DEMO.md).

This page is the short **“what to expect on a first trial”** contract. It does not claim general-purpose website generation for arbitrary products.

---

## What is ready

- **Canonical demo:** [`examples/benchmark_flagship/app.tq`](../examples/benchmark_flagship/app.tq) — login-shaped flow that materializes a **Vite + React** tree under `generated_out/` (after `torqa build`).
- **Single demo entry:** `torqa demo` (repo root, after `pip install -e .`) prints the full first-trial command list — use that printout as source of truth. Legacy duplicate: `torqa-flagship` (same text and `verify`).
- **Trial package index:** [`examples/trial_ready/README.md`](../examples/trial_ready/README.md) — run demo + see benchmark (`torqa demo benchmark` or `torqa-console`).
- **Sanity check:** `torqa demo verify` — flagship files, gate expectations, compression baseline shape, fresh benchmark run (same as `torqa-flagship verify`).
- **Compression story:** checked-in [`examples/benchmark_flagship/compression_baseline_report.json`](../examples/benchmark_flagship/compression_baseline_report.json); regenerate with `torqa-compression-bench examples/benchmark_flagship --repo-root .` (optional `--write` to that path).
- **Gate proof:** `torqa-gate-proof` — manifest under [`examples/benchmark_flagship/gate_invalid/`](../examples/benchmark_flagship/gate_invalid/).
- **Surfaces:** `torqa-console` → product site at `/`, IR lab at `/console`, browser IDE at `/desktop`. **Official native desktop:** `torqa-desktop` (Electron under `desktop/`; needs `npm install` there). **Legacy:** `torqa-desktop-legacy` / `python -m desktop_legacy --tk`.

---

## What is intentionally limited

- **Generated web UI** is a **credible preview shell** (layout, flow copy, declared result line) — not a production design system, auth backend, or CMS.
- **Projection coverage** is strongest for **flow-shaped** demos (forms, steps, guards); arbitrary marketing sites or large SPAs are out of scope for this milestone.
- **Local prototype** — follow [`WEBUI_SECURITY.md`](WEBUI_SECURITY.md) before exposing servers to untrusted networks.

---

## Best path for a first trial

1. `pip install -e .`
2. **`torqa demo`** — read the printed steps (canonical index for this trial).
3. **`torqa demo verify`** — sanity-check flagship assets, gate expectations, and compression baseline.
4. **`torqa build examples/benchmark_flagship/app.tq`** — materialize the tree (default `generated_out/`).
5. Open `generated_out/generated/webapp/`, run `npm install` then `npm run dev` (see [`DEMO_LOCALHOST.md`](DEMO_LOCALHOST.md)).
6. **`torqa-console`** — product site at `/`, IR lab at `/console`, desktop UI at `/desktop`; skim baseline JSON and `torqa-gate-proof` when you want proof detail.

---

## Flows TORQA handles well today

- **Intent-first flows** with inputs, pre/post conditions, transitions, and explicit **result** lines — especially **auth-shaped** and **session-shaped** demos.
- **Multi-surface projection** from one IR: webapp + SQL + stubs, with validation **before** materialize completes.

---

## What users should not expect yet

- **100% general website generation** from free-form prose.
- **Hosted SaaS** or hardened production deployment from this repo alone.
- **Guaranteed parity** with hand-crafted product UI/UX; the value story is **checkable intent + measured compression + gate**, then incremental projection quality.

---

## Related docs

| Doc | Role |
|-----|------|
| [`FLAGSHIP_DEMO.md`](FLAGSHIP_DEMO.md) | Full flagship walkthrough |
| [`QUICKSTART.md`](QUICKSTART.md) | Install + minimal `.tq` build |
| [`BENCHMARK_COMPRESSION.md`](BENCHMARK_COMPRESSION.md) | Compression metrics |
| [`VALIDATION_GATE.md`](VALIDATION_GATE.md) | Gate semantics |
| [`DEMO_SURFACES.md`](DEMO_SURFACES.md) | Web vs desktop vs console |
