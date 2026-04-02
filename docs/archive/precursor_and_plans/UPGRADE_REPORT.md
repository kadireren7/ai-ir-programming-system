# Platform upgrade report (internal)

## Added modules

- `src/ir/quality.py` — `build_ir_quality_report`
- `src/ir/explain.py` — `explain_ir_goal`, conditions, transitions
- `src/ir/migrate.py` — `migrate_ir_bundle` (identity)
- `src/semantics/fix_suggestions.py` — `build_semantic_fix_suggestions`
- `src/execution/parity_report.py` — `build_engine_parity_report`
- `src/codegen/generation_quality.py` — `build_generation_quality_report`
- `src/control/patch_risk.py` — `score_patch_risk`
- `src/control/patch_preview.py` — `build_patch_preview_report`
- `src/diagnostics/system_health.py` — `build_system_health_report`
- `projection_strategy.explain_projection_strategy`

## CLI

- Global `--json`
- `explain`, `quality`, `strategy`, `preview-patch`, `check` (+ `--output` on check)

## Web API

- `/api/quality`, `/api/explain`, `/api/strategy`, `/api/preview-patch`, `/api/system-health`

## Docs

- Architecture, IR pipeline, engine routing, projection, surfaces, IR versioning, AI boundary, patch contract, checkpoint policy, STATUS, ROADMAP, this report.

## Not done (from mega-prompt)

Execution trace depth, full `src/legacy/` moves, archive migration of all Turkish docs, rich web session undo/redo, full CI parity matrix, self-evolution hardening.
