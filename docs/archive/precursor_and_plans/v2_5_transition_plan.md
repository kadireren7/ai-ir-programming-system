# V2.5 transition plan (practical implementation scope)

This repository now includes a Rust core crate scaffold and functional minimum APIs for:

- IR model + serde
- IR validation
- IR normalization + fingerprint
- semantic symbol/guarantee/verifier passes
- execution planner/evaluator/runtime trait boundary
- projection strategy
- projection codegen stubs
- Python CLI bridge (`run_rust_core`)

## Important scope note

The full prompt spans a multi-release program (V2.5, V3, V4 behaviors). This iteration establishes the architecture boundary and runnable foundations without claiming complete parity for every Python path.

## Current migration status

- **Rust-centered modules exist** under `rust-core/src/...` with the requested package shape.
- **IR contract safety** is retained (serde structs, validation, normalization/fingerprint).
- **Projection remains dynamic** (scoring-style strategy; no fixed domain-language table).
- **Python remains orchestration layer**, now able to call Rust through JSON bridge.

## Remaining deepening work (next iterations)

1. Expand Rust semantics to exact parity with Python `ir_semantics.py` error/warning details.
2. Wire real runtime function registry in Rust execution (currently trait boundary + skeleton).
3. Add stronger multi-target artifact generation contracts beyond stubs.
4. Add robust IR feedback/refinement loop (currently architecture placeholder in docs).
5. Incrementally switch Python runtime calls to Rust pipeline in default mode.
