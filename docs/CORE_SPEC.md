# TORQA — Core IR specification (v1.4)

This document is the **normative English contract** for the TORQA AI-native core as serialized JSON (interchange profile). Implementations (Python prototype, Rust engine, web UI) must treat **`ir_goal` inside the bundle** as the logical source of truth for pipeline input.

For the **AI-native language charter** (goals, host-independence meaning, bootstrap vs target architecture), see [`AI_NATIVE_LANGUAGE_CHARTER.md`](AI_NATIVE_LANGUAGE_CHARTER.md).

## Specification stack (beyond this wire contract)

This file plus [`spec/IR_BUNDLE.schema.json`](../spec/IR_BUNDLE.schema.json) define the **canonical JSON envelope and integrity rules** that implementations enforce today. The following documents layer **host-independent meaning, execution, evolution, and LLM-facing production**; prototype code should converge toward them over time.

| Document | Role |
|----------|------|
| [`FORMAL_CORE.md`](FORMAL_CORE.md) | Single “law”: configurations (μ, σ, π), condition/transition meaning, validation phases (`syntax` → `kind_type` → `wellformed` → `policy`) and mapping notes to `PX_*` / diagnostics phases. |
| [`AEM_SPEC.md`](AEM_SPEC.md) | Abstract Execution Machine: stores, evaluation, steps, side-effect boundary, determinism; intentional gaps vs today’s `effect_name` / reference Python executor. |
| [`SELF_EVOLUTION_PIPELINE.md`](SELF_EVOLUTION_PIPELINE.md) | Frozen core vs rule-bound extension; builtin/library pipeline; automatic rejection of unsafe AI output; human approval; constrained alphabet and layered prompting. |
| [`AI_GENERATION_PROFILE.md`](AI_GENERATION_PROFILE.md) | Fixed vocabulary, allowed IR shapes, `metadata` / `ir_version` / `library_refs`, validate-then-expand, minimal-diff repair; used by `src/language/authoring_prompt.py`. |

## Envelope

```json
{
  "ir_goal": { ... },
  "library_refs": [
    { "name": "example-lib", "version": "1.0.0", "fingerprint": "optional-sha256-hex" }
  ]
}
```

`library_refs` is **optional** and reserved for ecosystem tooling (shared IR libraries). The canonical Python/Rust interchange uses at least `ir_goal`. Fingerprints and stable ordering are defined in `src/ir/canonical_ir.py` (`ir_goal_to_json`, `compute_ir_fingerprint`).

## Machine-readable schema

See [`spec/IR_BUNDLE.schema.json`](../spec/IR_BUNDLE.schema.json) (JSON Schema draft 2020-12). Tests validate golden examples against it.

## Semantic roles

| Section | `kind` (where applicable) | Role |
|--------|---------------------------|------|
| `preconditions` | `require` | What must hold before the flow proceeds. |
| `forbids` | `forbid` | States or combinations that must not occur. |
| `postconditions` | `postcondition` | Expected properties after transitions. |
| `transitions` | — | Named effects moving between `before` / `after` states. |
| `result` | — | Human-readable outcome label (projection-friendly). |

## Identifier conventions (integrity validation)

Python `validate_ir` enforces:

- Precondition ids: `c_req_NNNN` (four digits).
- Forbid ids: `c_forbid_NNNN`.
- Postcondition ids: `c_post_NNNN`.
- Transition ids: `t_NNNN`.
- All `condition_id` values are **globally unique** within the goal.
- Input `type`: one of `text`, `number`, `boolean`, `void`, `unknown`.

Stricter **Rust handoff** rules (ASCII identifiers, allowed operators) are checked separately via `validate_ir_handoff_compatibility`.

## Metadata

Required keys include `ir_version` (must match `CANONICAL_IR_VERSION` in code), `source`, and `canonical_language`. Golden examples use `ir_version` **1.4**.

## Projections

TypeScript, SQL, Rust, Python files under `generated/` are **projections**, not sources. Generated files should carry a header stating they are derived from the core IR.

## Semantic builtins (verifier registry)

The Python semantic layer (`default_ir_function_registry` in `src/semantics/ir_semantics.py`) defines **which function names** may appear in `call` expressions and as `transition.effect_name`. Names outside this set fail semantic verification. Roles:

- **predicate** — typically used in preconditions / forbids / postconditions; return type `boolean` (or `text` / `number` where applicable).
- **effect** — `return_type` `void`; use **only** as `effect_name` on transitions, with arguments matching the registry.

Authoring reference (JSON, includes minimal bundle): run `TORQA language`. The LLM system prompt is built from the same source (`src/language/authoring_prompt.py`) so AI formalization stays aligned with the verifier.

## AI generation boundary

Tools that emit IR from natural language must:

1. Output JSON that satisfies this schema and `validate_ir`.
2. Pass `validate_ir_handoff_compatibility` before the Rust-preferred pipeline.
3. On failure, repair using structured error messages from the verifier—never bypass validation.

Implementations should prefer **`build_full_diagnostic_report`** (`src/diagnostics/report.py`) so both humans and models receive **stable `code` values** (`src/diagnostics/codes.py`) in addition to messages.
