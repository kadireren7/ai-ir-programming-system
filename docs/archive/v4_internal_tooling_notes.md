# V4 internal tooling notes

## Purpose

Internal tooling is for system self-understanding, not user-facing syntax features.

## Inspection tools

`internal_tooling.py` provides:

- `inspect_ir_goal`
- `inspect_projection_plan`
- `inspect_projection_graph`
- `inspect_artifacts`
- `inspect_execution_result`

These provide compact operational diagnostics for automated pipelines and regression checks.

## Self-analysis

`build_self_analysis_report(...)` summarizes:

- semantic quality,
- guarantee coverage (before/after),
- projection diversity,
- artifact density,
- consistency health,
- execution status (when available),
- weak spots and system notes.

## Maintenance philosophy

Maintenance hooks prune noise without mutating semantics:

- `prune_unused_projection_targets`
- `prune_empty_artifacts`
- `prune_obsolete_metadata`

This supports self-sustaining behavior: cleaner outputs, clearer manifests, stable IR contract.
