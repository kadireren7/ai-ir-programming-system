# Token compression benchmark (P32)

## What this measures

This benchmark answers: **how compact is TORQA compared to a natural-language task description**, and **how large is the canonical IR and generated webapp** relative to the `.tq` surface — using **deterministic token estimates**, not live LLM tokenizers.

It supports TORQA’s first core promise (**semantic compression**: same intent, fewer tokens than typical NL→code workflows) in a **repeatable** way inside the repo.

## What this does **not** measure

- **Not** model intelligence, code quality, or correctness of generated JS/TS.
- **Not** exact OpenAI / Anthropic token counts (no API keys, no `tiktoken` in the default path).
- **Not** competitor LLM behavior — the **task prompt** file (`BENCHMARK_TASK.md`) is a **fixed comparator text**, not an executed model trace.

## Estimator

Default **`utf8_bytes_div_4_v1`**:  
`token_estimate = max(1, ceil(utf8_byte_length / 4))` for non-empty strings, `0` for empty.

This is a **rough** stand-in for subword tokenization on English/prose and code. All runs use the same rule so **ratios and ordering are reproducible** across machines.

## Metrics (JSON `metrics` object)

| Field | Meaning |
|-------|---------|
| `task_prompt_token_estimate` | `BENCHMARK_TASK.md` full text |
| `torqa_source_token_estimate` | `app.tq` full text |
| `ir_bundle_token_estimate` | Canonical minified JSON of `ir_goal` only (`sort_keys=True`) |
| `generated_output_token_estimate` | Sum of estimates over listed `generated/webapp/...` files (from fixture paths) |
| `generated_output_measured` | `true` if a materialize root was used |
| `semantic_compression_ratio` | `task_prompt / max(1, torqa_source)` — NL task is this many × larger than `.tq` |
| `surface_to_ir_ratio` | `ir_bundle / max(1, torqa_source)` — IR expansion factor |
| `generated_to_surface_ratio` | `generated / max(1, torqa_source)` if measured, else `null` |

## Running

From repository root, after `pip install -e .`:

**Canonical measurement JSON** (field names `prompt_tokens`, `torqa_tokens`, `ir_tokens`, `generated_code_tokens`, `semantic_compression_ratio`, … — same estimator, deterministic):

```bash
torqa-token-measure benchmark-dir examples/benchmark_flagship --repo-root .
```

**P32 compression report** (legacy metric names in `metrics` — built from the same core):

```bash
torqa-compression-bench examples/benchmark_flagship --repo-root . \
  --write examples/benchmark_flagship/compression_baseline_report.json
```

Or without installing the entry point:

```bash
python scripts/run_compression_benchmark.py examples/benchmark_flagship --repo-root . \
  --write examples/benchmark_flagship/compression_baseline_report.json
```

- Omit `--write` to print JSON only.
- `--no-generated` — surface + IR only (no materialize).
- `--materialize-root PATH` — use an existing `torqa build` output tree instead of a temp dir.

## Tests

`tests/test_compression_benchmark_p32.py` checks the utility, stable schema, and deterministic ratios for the flagship demo.

## Baseline file

**`examples/benchmark_flagship/compression_baseline_report.json`** — checked-in **first** report (regenerate after changing `BENCHMARK_TASK.md`, `app.tq`, or projection outputs for listed paths).

## Related

- [BENCHMARK_FLAGSHIP.md](BENCHMARK_FLAGSHIP.md) — P31 canonical demo
- [TORQA_DOMINANCE.md](TORQA_DOMINANCE.md) — architecture snapshot
