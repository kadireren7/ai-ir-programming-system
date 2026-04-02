# Rust semantic migration plan (V1.2)

English-only planning note for aligning the Python prototype with a future Rust core.

## Shift of the semantic center

- **V1.2** moves primary **semantic analysis** from **`CoreGoal`** (Python transitional model) to **canonical `IRGoal`** and **`ir_semantics.py`**.
- **`CoreGoal`**, **`AdvancedVerifier`**, **`PostStateVerifier`**, and parser-linked guarantee builders remain as **legacy / transitional** paths. They stay in the pipeline for backward compatibility and execution until the Rust core replaces them.
- **Forward direction**: new checks, tools, and parity tests should target **`IRGoal`** + **IR-native APIs** (`build_ir_symbol_table`, `infer_ir_expr_type`, `build_ir_guarantee_table`, `validate_ir_semantics`, `build_ir_semantic_report`).

## What Rust should implement first

Mirroring `ir_semantics.py` and `canonical_ir.py`:

1. **IR validation** — structural integrity (`validate_ir`, handoff compatibility, semantic determinism) on deserialized JSON.
2. **IR type inference** — `infer_ir_expr_type` with a string-typed function registry (`IRFunctionSignature`).
3. **IR guarantee extraction** — `build_ir_guarantee_table` using `condition_id` / `transition_id` and registry `guarantees_after` metadata only (no `CoreGoal`).
4. **IR semantic verifier** — `validate_ir_semantics` rules (undefined identifiers, arity/types, forbid vs before guarantees, transition reads, warnings for empty result / missing after guarantees).

The **`build_ir_semantic_report`** shape is suitable for **golden / parity tests** between Python and Rust.

## Execution and prototypes

- **Execution** (`execute_core_goal`) remains **`CoreGoal`****-based in Python** for now. Rust execution (`planner` / `evaluator`) is a later phase.
- **Parser and normalization** stay in Python as orchestration; they must not become cross-language contracts.

## Contract stack (reminder)

| Layer            | Role                                      |
|-----------------|--------------------------------------------|
| Parser AST      | Parse structure only                       |
| `CoreGoal`      | Transitional semantic working model        |
| `IRGoal`        | Canonical transfer contract                |
| IR semantic passes | **Target behavior for Rust core**     |

## End state

The Rust engine should treat **bundle JSON + IR semantic report logic** as authoritative for static semantics, not Python-only `CoreGoal` internals.
