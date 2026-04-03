# P31 benchmark flagship

Canonical **login + dashboard shell** demo for repeatable benchmarks against normal codegen.

- **Single demo entry:** `torqa demo` (prints verify, build, console, proofs) · **Public walkthrough:** [`docs/FLAGSHIP_DEMO.md`](../../docs/FLAGSHIP_DEMO.md)
- **First trial (limits + expectations):** [`docs/TRIAL_READINESS.md`](../../docs/TRIAL_READINESS.md)
- **Spec:** [`app.tq`](app.tq)
- **Why / how to measure:** [`../../docs/BENCHMARK_FLAGSHIP.md`](../../docs/BENCHMARK_FLAGSHIP.md)
- **Comparator task text:** [`BENCHMARK_TASK.md`](BENCHMARK_TASK.md)
- **Expected surfaces (machine):** [`expected_output_summary.json`](expected_output_summary.json)
- **Compression baseline (P32):** [`compression_baseline_report.json`](compression_baseline_report.json) · [`docs/BENCHMARK_COMPRESSION.md`](../../docs/BENCHMARK_COMPRESSION.md)

```bash
torqa demo
torqa demo verify
torqa build examples/benchmark_flagship/app.tq
```

```bash
torqa-compression-bench examples/benchmark_flagship --repo-root . --write examples/benchmark_flagship/compression_baseline_report.json
```
