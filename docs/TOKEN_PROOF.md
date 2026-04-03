# TORQA token proof (P75)

Reproducible comparison of **natural-language task specs** and **fixed baseline code stubs** 
against **`.tq` surfaces** using the repository estimator (see `docs/BENCHMARK_COMPRESSION.md`).

- **Estimator:** `utf8_bytes_div_4_v1`
- **Method:** Token count := ceil_utf8_bytes(text) / 4 using integer arithmetic (n+3)//4; empty string -> 0; non-empty -> max(1, (utf8_byte_len + 3) // 4).

## Regenerate

```bash
torqa-token-proof
# or: python -m src.benchmarks.token_proof_cli
```

## Summary

| Metric | Value |
|--------|-------|
| Scenarios | 5 |
| Passed validation | 5 |
| Failed | 0 |
| Avg prompt ÷ TORQA tokens | 3.574615 |
| Avg (prompt + baseline code) ÷ TORQA | 8.892438 |
| Avg prompt-token reduction % vs `.tq` | 71.615054 |

## Per-scenario

| ID | Category | OK | prompt | baseline code | `.tq` | IR | prompt÷TQ | (prompt+code)÷TQ |
|----|----------|----|--------|---------------|-------|----|----------|----------------|
| simple_form_flow | simple form flow | yes | 223 | 279 | 52 | 295 | 4.288462 | 9.653846 |
| approval_workflow | approval workflow | yes | 209 | 303 | 55 | 299 | 3.8 | 9.309091 |
| data_transform_pipeline | data transformation | yes | 187 | 279 | 55 | 298 | 3.4 | 8.472727 |
| conditional_logic_flow | multi-step logic | yes | 176 | 288 | 52 | 338 | 3.384615 | 8.923077 |
| multi_step_automation | small automation | yes | 174 | 296 | 58 | 255 | 3.0 | 8.103448 |

## Notes

- compression_ratio_prompt_per_torqa = prompt_tokens / max(1, torqa_tokens).
- compression_ratio_combined_per_torqa = (prompt_tokens + baseline_code_tokens) / max(1, torqa_tokens).
- average_prompt_token_reduction_percent_vs_torqa = mean over passing scenarios of (prompt_tokens - torqa_tokens) / prompt_tokens * 100.
- baseline_code_tokens: fixed BASELINE_CODE.txt per scenario (approximate non-TORQA implementation).
- ir_to_torqa_ratio > 1 means canonical IR JSON is larger than the .tq surface (expected); NL→TQ compression is the headline claim.
- Failed scenarios are listed with errors; they are excluded from summary averages.

## Machine-readable report

See `reports/token_proof.json`.
