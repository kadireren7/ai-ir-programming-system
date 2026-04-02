# Rust execution migration plan (V1.3)

This note defines the execution-side migration from Python prototype internals to an IR-native Rust runtime.

## What changed in V1.3

- Execution semantics now run directly from canonical `IRGoal` via `ir_execution.py`.
- Planning and execution use canonical boundary IDs:
  - condition IDs (`c_req_*`, `c_forbid_*`)
  - transition IDs (`t_*`)
  - execution step IDs (`s_*`)
- IR execution output includes plan/result JSON and after-state summary built from IR guarantees.

## Transitional status

- `CoreGoal` execution still exists in `kural_parser.py` as a legacy path.
- IR execution is the primary forward path; `CoreGoal` execution is transitional/deprecated.
- CLI supports `--ir-execution-only` to skip legacy execution and run IR execution only.

## Rust-first implementation targets

Rust should implement these layers against the handoff bundle + canonical IR:

1. **IR execution planner**
   - build ordered runtime plan from IR conditions/transitions
   - deterministic step IDs and references

2. **IR expression evaluator**
   - evaluate identifier/literal/call/binary/logical nodes from IR only
   - no dependency on parser AST or prototype-only structures

3. **Runtime binding layer**
   - function signature registry for static semantics
   - runtime implementation registry for execution callbacks
   - keep static and dynamic layers separate

4. **After-state summary**
   - derive guarantees from IR guarantee table
   - filter by executed transitions
   - emit canonical reads/writes/guarantees summary for diagnostics and parity tests

## Contract discipline

- Python AST and `CoreGoal` are not cross-language contracts.
- Canonical IR and exported bundle remain the contract.
- IR execution behavior should be treated as the canonical execution model for Rust parity going forward.
