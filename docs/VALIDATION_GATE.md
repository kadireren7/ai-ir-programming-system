# Validation gate (P33)

## Product promise

**Every TORQA input is either accepted or rejected — never half-entered.**

- Parsed surface (`.tq`) becomes a bundle dict only when parse succeeds. A parse error does not produce a bundle for validation or projection.
- **Validate** runs envelope checks, IR shape, and semantics. If validation fails, **projection does not run** and no successful “system input” path is recorded (`materialize_project` returns with `written=[]` when validation fails).
- **Project** runs only on a validated IR goal. Consistency failures at this stage still mean the run is not a clean accept (CLI exits non-zero; artifacts may exist on disk for inspection — treat as rejected outcome, not a shipped tree).

## Proof in the repo

| What | Where |
|------|--------|
| Intentionally broken fixtures | `examples/benchmark_flagship/gate_invalid/` |
| Manifest + expectations | `examples/benchmark_flagship/gate_invalid/manifest.json` |
| Report runner | `torqa-gate-proof` or `python -m src.benchmarks.gate_proof_cli` |
| Automated tests | `tests/test_gate_proof_p33.py` |

Run the report from the repo root:

```bash
torqa-gate-proof
# or
python -m src.benchmarks.gate_proof_cli --manifest examples/benchmark_flagship/gate_invalid/manifest.json
```

The JSON summary includes `accepted` / `rejected`, `rejections_by_stage` (`parse`, `validate`, `project`), and per-case `mismatch` flags when observed behavior differs from the manifest.

## CLI transparency

With `torqa --json project …`, failures before a completed pipeline still include `pipeline_stages` so tools can see which stage stopped the run (for example parse vs validate).

## See also

- [FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md) — full public flagship package (P35).
- [BENCHMARK_FLAGSHIP.md](BENCHMARK_FLAGSHIP.md) — flagship demo and benchmark story (tokens + gate).
