# V4 self-sustaining architecture

V4 is a transition stage, not a final product.

## What V4 means

- IR is the operational center for validation, semantics, execution, projection, and orchestration outputs.
- The system can inspect its own outputs, report weak spots, prune noise, and emit machine-readable manifests.
- Architecture policy is explicit (rust-preferred where core logic exists, python fallback where migration/tooling is still needed).

## Operational center

Canonical IR drives:

- semantic analysis
- projection strategy
- projection graph
- multi-target artifact production
- consistency checks
- self-analysis reporting

## Engine direction

- **Rust**: preferred long-term semantic + execution core direction.
- **Python**: parser bridge, orchestration, migration support, tooling fallback.

## Self-sustaining threshold

V4 crosses the threshold by adding:

- capability registry
- system manifest
- self-analysis report
- maintenance/pruning hooks
- explicit engine routing policy

The system is now internally aware of its architecture state and can simplify outputs without changing semantics.
