# Cleanup report (V4)

## Deleted files

None in this pass (safe cleanup mode).

Reason:
- avoid accidental loss of user/historical migration context without explicit archival approval.

## Archived files

None physically moved in this pass.

Reason:
- archival boundary is represented via explicit deprecation policy + capability registry status.

## Retained canonical files

- `canonical_ir.py`
- `ir_semantics.py`
- `ir_execution.py`
- `projection_strategy.py`
- `projection_graph.py`
- `system_orchestrator.py`
- `capability_registry.py`
- `internal_tooling.py`
- `rust_bridge.py`
- `self_evolution.py`
- `rust-core/` (Rust migration path)

Reason:
- these files define active forward architecture and IR-centered operational flow.

## Retained transitional files

- `kural_parser.py` legacy CoreGoal path sections (deprecated boundary)

Reason:
- migration compatibility and consistency checks while Rust/IR-native direction matures.

## Cleanup outcome summary

- explicit deprecated boundary established,
- capability ownership made machine-readable,
- V4 self-analysis and maintenance hooks added,
- canonical IR contract and Rust-forward path preserved.
