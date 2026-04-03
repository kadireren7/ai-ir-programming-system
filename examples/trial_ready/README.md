# Trial-ready package

Single place for a **first trial**: run the public demo path and **see the flagship compression benchmark** without hunting paths.

Canonical spec and fixtures live under [`../benchmark_flagship/`](../benchmark_flagship/).

## Prerequisites

From the **repository root** (after `pip install -e .` — see [QUICKSTART.md](../../docs/QUICKSTART.md)):

- `python -m torqa` or the `torqa` console script on your `PATH`.

## Run demo

Prints the full first-trial command list (build, console, gate, bench):

```bash
torqa demo
```

Optional sanity check (assets + gate expectations + live compression vs checked-in baseline):

```bash
torqa demo verify
```

## See benchmark

**Terminal (no server)** — summary from the checked-in baseline JSON:

```bash
torqa demo benchmark
```

Machine-readable:

```bash
torqa --json demo benchmark
```

**Web UI** — start the console, open the product site; the benchmark panel uses the same flagship report:

```bash
torqa-console
```

Then open `http://127.0.0.1:8000/` (and `/console` or `/desktop` if you want those surfaces).

**Native desktop:** `torqa-desktop` (Electron in `desktop/`; run `cd desktop && npm install` once) — see [`desktop/README.md`](../../desktop/README.md). Legacy: `torqa-desktop-legacy`.

**On disk:** `examples/benchmark_flagship/compression_baseline_report.json`

Deep detail: [BENCHMARK_COMPRESSION.md](../../docs/BENCHMARK_COMPRESSION.md), [FLAGSHIP_DEMO.md](../../docs/FLAGSHIP_DEMO.md).

## One-shot scripts (optional)

From repo root, after install:

- **Unix:** `./examples/trial_ready/trial_run.sh`
- **Windows (PowerShell):** `.\examples\trial_ready\trial_run.ps1`

These run `torqa demo` then `torqa demo benchmark` using `python -m torqa`.
