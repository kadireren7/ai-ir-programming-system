# Codegen / projection inventory (F0.2)

Host-language **emitters** under `src/codegen` and planning under `src/projection`.

| Path | Classification | Rationale |
|------|----------------|-----------|
| `src/codegen/artifact_builder.py` | **PREVIEW** | Builds Vite/React/SQL/stub strings; templates are replaceable; not required for IR JSON validity. |
| `src/codegen/ir_to_projection.py` | **PREVIEW** | Language-specific stub text (Rust, Go, Kotlin, …) derived from IR. |
| `src/codegen/generation_quality.py` | **CORE** (tooling) | Measures readiness of generated artifacts against policy thresholds; supports validation story. |
| `src/projection/projection_strategy.py` | **CORE** (planning) | Chooses projection targets from IR semantics; no file bytes. |
| `src/projection/extra_artifacts.py` | **PREVIEW** | Hook for optional third-party projection modules (`TORQA_PROJECTION_MODULE`). |
| `src/projection/projection_graph.py` | **CORE** (analysis) | Graph-shaped projection notes; structural analysis only. |

**CORE** here means “part of the semantic / validation / planning contract in this monorepo.” **PREVIEW** means “replaceable emitters; could move to `torqa-preview-*` extras per `docs/PACKAGE_SPLIT.md`.”
