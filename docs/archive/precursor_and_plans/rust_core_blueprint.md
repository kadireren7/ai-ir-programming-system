# Rust core engine blueprint (V1.0-prep)

This document describes the intended layout of the future **Rust canonical core**. It is a planning artifact only; no Rust code is required in the Python prototype repository yet.

## Crate layout

```text
rust-core/
  Cargo.toml
  src/
    lib.rs
    ir/
      mod.rs
      expr.rs
      goal.rs
      validate.rs
    semantic/
      mod.rs
      guarantees.rs
      verifier.rs
    execution/
      mod.rs
      planner.rs
      evaluator.rs
    ffi/
      mod.rs
```

## Module roles

- **`ir/`** — Canonical Rust representation of the handoff IR: expression AST, goal structure, and IR-level validation (integrity checks matching `canonical_ir.validate_ir` / handoff rules). This layer must deserialize the JSON bundle produced by `export_ir_bundle_json` without depending on Python.

- **`semantic/`** — Static semantics: guarantee tables (before/after), advanced and post-state verifiers, and any future type/signature registry. This corresponds to the Python semantic core built on top of `CoreGoal`, but should eventually consume or mirror the same contracts as the IR boundary.

- **`execution/`** — Runtime planner, expression evaluator, and effect invocation. Populated in a later phase; the Python executor remains the reference prototype until this module is implemented.

- **`ffi/`** — Optional foreign-function interface for embedding the Rust core in Python, editors, or other hosts. Keeps C-compatible or `cbindgen`-friendly entry points separate from pure Rust APIs.

## Type mapping note (Python helper)

The prototype exposes `ir_type_to_rust()` with this convention:

| IR `type_name` | Rust (initial) |
|----------------|----------------|
| `text`         | `String`       |
| `number`       | `i64`          |
| `boolean`      | `bool`         |
| `void`         | `()`           |
| `unknown`      | `IrUnknown` (placeholder enum) |

Fractional numbers are not represented in this first mapping; the handoff validator rejects non-integer floats in IR number literals. This convention may evolve (for example `f64` or a dedicated numeric enum).

## Handoff contract

The official interchange artifact is the JSON object produced by `export_ir_bundle()` / `export_ir_bundle_json()` in Python, with `bundle_version` and `ir.ir_goal.metadata.ir_version` aligned to **`CANONICAL_IR_VERSION`** in `canonical_ir.py` (see that file; V1.1 adds normalization, fingerprint, and stable IDs). See `rust_handoff_contract.md` for the handoff rules.

The Python prototype remains parser, normalizer, and orchestration only; the Rust tree above is the intended long-term home for the canonical semantic and execution core.
