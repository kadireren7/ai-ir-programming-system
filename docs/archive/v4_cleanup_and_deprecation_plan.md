# V4 cleanup and deprecation plan

## Cleanup policy used

This V4 pass uses a **safe cleanup strategy**:

- keep canonical/forward files intact,
- avoid destructive removal of potentially user-authored historical notes,
- explicitly mark deprecated boundaries in code and manifests.

## Deprecated/transitional boundaries

- `CoreGoal` execution path remains present but is marked transitional/deprecated.
- IR-native paths are treated as canonical forward direction.
- Rust-preferred ownership is explicitly documented via capability registry and manifest.

## What was consolidated

- New capability ownership model (`capability_registry.py`).
- New internal tooling and self-analysis (`internal_tooling.py`).
- V4 orchestrator mode (`SystemOrchestrator.run_v4`) with pruning + manifest outputs.

## What remains transitional

- Legacy CoreGoal path in `kural_parser.py` (kept for migration safety).
- Rust bridge remains optional runtime path depending on local toolchain.

## Why no broad file deletion

Several older docs/files may still be useful historical context for migration decisions.
To avoid accidental loss, this pass keeps them and reports cleanup status explicitly.

Future aggressive cleanup can proceed once user-approved archival/delete lists are confirmed.
