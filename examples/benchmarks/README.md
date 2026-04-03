# TORQA benchmark task set

This directory defines **standard comparison tasks** for evaluating **TORQA (compact validated intent)** versus **raw code** (typical hand-written implementation in a general-purpose language or ad-hoc NL → codegen).

**Scope:** each task folder has **`TASK.md`** (frozen NL comparator) and a minimal **`app.tq`** for repeatable token comparison. Regenerate the aggregate JSON with `torqa-benchmark-initial` or `python -m src.benchmarks.benchmark_initial_cli` → [`reports/benchmark_initial.json`](../reports/benchmark_initial.json).

**`reports/benchmark_initial.json`** compares **TORQA surface tokens** vs the **NL task** (`TASK.md`) and a **simulated raw-code token footprint** (`raw_code_simulation`: `max(4×prompt, 10×IR, floor)`). Per task, **`complexity`** counts IR list elements (inputs, preconditions, forbids, transitions, postconditions); **`ir_to_torqa_ratio`** is IR JSON tokens ÷ `.tq` tokens (expansion from surface to canonical IR).

**AI retry stats** (per task: API rounds, retries after first success, failure rate): `torqa-retry-stats` → `reports/retry_stats.json` (add `--live` and `OPENAI_API_KEY` for real measurements; default is a deterministic skip report).

**Failure type classification** (syntax vs structure vs semantic): `torqa-failure-types` → `reports/failure_types.json`.

## How to use

1. Pick a task folder.
2. Implement the same behavior **twice** under agreed rules: (a) expressed in TORQA’s surface + projections, (b) expressed as raw application code (or baseline NL+codegen, if that is your comparator).
3. Measure what your study cares about (e.g. source size, token counts, time to first correct validation, defect rate against the expected behavior summary).

## Task index

| Task | Folder |
|------|--------|
| Simple form flow | [`simple_form_flow/`](simple_form_flow/) |
| Approval workflow | [`approval_workflow/`](approval_workflow/) |
| Data transform pipeline | [`data_transform_pipeline/`](data_transform_pipeline/) |
| Conditional logic flow | [`conditional_logic_flow/`](conditional_logic_flow/) |
| Small multi-step automation | [`multi_step_automation/`](multi_step_automation/) |
| **Customer onboarding** (real workflow) | [`workflow_customer_onboarding/`](workflow_customer_onboarding/) |
| **Document approval** (real workflow) | [`workflow_document_approval/`](workflow_document_approval/) |

## Frozen wording

Task descriptions are meant to stay **stable** across benchmark runs. If you change a task, version or date the change in the task file.
