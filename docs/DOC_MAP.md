# Documentation map

Grouped entry points. **Normative** technical contracts are marked.

## Onboarding & operations

| Document | Role |
|----------|------|
| [README.md](../README.md) | Install, happy path, CLI / `torqa_public` entry surfaces |
| [examples/workspace_minimal/README.md](../examples/workspace_minimal/README.md) | Minimal `.tq` + `project` |
| [MAINTAINER_VERIFY.md](MAINTAINER_VERIFY.md) | Maintainer smoke commands |
| [CHANGELOG.md](../CHANGELOG.md) | Release notes |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution process |
| [DEMO_LOCALHOST.md](DEMO_LOCALHOST.md) | Run generated Vite app locally |

## Product direction (non-normative wire)

| Document | Role |
|----------|------|
| [TORQA_VISION_NORTH_STAR.md](TORQA_VISION_NORTH_STAR.md) | One-page product north star |
| [TORQA_NIHAI_VISION_ROADMAP.md](TORQA_NIHAI_VISION_ROADMAP.md) | Phases F0–F5 + prompts (TR) |
| [ROADMAP.md](../ROADMAP.md) | Staged milestones (EN) |
| [AI_NATIVE_LANGUAGE_CHARTER.md](AI_NATIVE_LANGUAGE_CHARTER.md) | AI-native goals and boundaries |
| [STATUS.md](../STATUS.md) | Short maturity snapshot |

## Normative / technical contract

| Document | Role |
|----------|------|
| [CORE_SPEC.md](CORE_SPEC.md) | **Normative** IR JSON wire contract |
| [FORMAL_CORE.md](FORMAL_CORE.md) | **Normative** semantics + validation phases |
| [AEM_SPEC.md](AEM_SPEC.md) | **Normative** abstract execution machine skeleton |
| [AI_GENERATION_PROFILE.md](AI_GENERATION_PROFILE.md) | **Normative** LLM output profile |
| [SELF_EVOLUTION_PIPELINE.md](SELF_EVOLUTION_PIPELINE.md) | Evolution / proposal policy |
| [IR_VERSIONING.md](IR_VERSIONING.md), [IR_VERSION_MIGRATION.md](IR_VERSION_MIGRATION.md) | Version and migration |
| [PATCH_CONTRACT.md](PATCH_CONTRACT.md), [generation_plan_contract.md](generation_plan_contract.md) | Patch and generation contracts |
| [artifact_quality_rules.md](artifact_quality_rules.md), [website_generation_threshold.md](website_generation_threshold.md), [website_success_gate.md](website_success_gate.md) | Quality gates |
| [CHECKPOINT_POLICY.md](CHECKPOINT_POLICY.md), [AI_BOUNDARY.md](AI_BOUNDARY.md) | Checkpoints and AI boundary |
| [rust_handoff_contract.md](rust_handoff_contract.md) | Python–Rust handoff |
| `spec/IR_BUNDLE.schema.json` | JSON Schema (repo root) |

## Implementation reference

| Document | Role |
|----------|------|
| [PACKAGE_SPLIT.md](PACKAGE_SPLIT.md) | Core vs preview, `torqa_public` API |
| [ARCHITECTURE_STATUS.md](ARCHITECTURE_STATUS.md), [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md), [MODULE_OWNERSHIP.md](MODULE_OWNERSHIP.md) | Layer and module status |
| [IR_PIPELINE.md](IR_PIPELINE.md), [ENGINE_ROUTING.md](ENGINE_ROUTING.md) | Pipeline and engine routing |
| [PROJECTION_MODEL.md](PROJECTION_MODEL.md), [CODEGEN_INVENTORY.md](CODEGEN_INVENTORY.md), [projection_strategy_architecture.md](projection_strategy_architecture.md) | Projection / codegen |
| [WEBUI_AND_CLI_SURFACES.md](WEBUI_AND_CLI_SURFACES.md) | HTTP and CLI inventory |
| [DEPRECATION_MAP.md](DEPRECATION_MAP.md) | Deprecated paths |
| [F1_F2_GAP.md](F1_F2_GAP.md) | F1/F2 vs repo checklist |

## Security

| Document | Role |
|----------|------|
| [WEBUI_SECURITY.md](WEBUI_SECURITY.md), [PROTOTYPE_SECURITY.md](PROTOTYPE_SECURITY.md) | Threat model and prototype warnings |

## AI / maintainer prompts

| Document | Role |
|----------|------|
| [AI_FIRST_PROMPT_PLAYBOOK.md](AI_FIRST_PROMPT_PLAYBOOK.md) | Ordered prompt stages |
| [TORQA_PROMPT_CATALOG.md](TORQA_PROMPT_CATALOG.md) | P1–P11 catalog |
| [TORQA_MAJOR_WORK_PROMPTS.md](TORQA_MAJOR_WORK_PROMPTS.md) | Large-change prompts |

## Archive

| Path | Role |
|------|------|
| [archive/INDEX.md](archive/INDEX.md) | Superseded v3/v4 notes + precursor index |
| [archive/precursor_and_plans/](archive/precursor_and_plans/) | Kural v0, rust drafts, one-off reports |

## Editor tooling (experimental)

| Document | Role |
|----------|------|
| [editor_architecture.md](editor_architecture.md), [editor_session_contract.md](editor_session_contract.md), [editor_diagnostics_model.md](editor_diagnostics_model.md) | Editor contracts |
| [git_checkpoint_readiness.md](git_checkpoint_readiness.md) | Git checkpoint checks |

`parity_status_report.md` and `rust_dominance_status.md` remain in `docs/` (referenced by internal shell doc presence checks).
