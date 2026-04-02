# V3 ecosystem architecture

V3 shifts the system from a single projection pipeline to an IR-centered multi-domain ecosystem.

## Core idea

One canonical IR describes semantics and execution intent. The system then:

1. performs semantic analysis,
2. chooses projection targets dynamically,
3. builds a projection graph,
4. generates artifacts for each selected target,
5. validates cross-projection consistency,
6. feeds outcomes into IR refinement hooks.

## Why this is different

This is no longer just "IR -> one output". It is:

- IR -> multiple coordinated outputs
- shared semantics across targets
- explicit dependency/feeding/mirroring relations

## Components introduced

- `projection_graph.py`:
  - graph model (`ProjectionNode`, `ProjectionEdge`, `ProjectionGraph`)
  - graph builder from projection plan + IR profile
- `system_orchestrator.py`:
  - end-to-end orchestration of semantic report, projection, graph, artifacts, consistency
- `projection_strategy.py`:
  - now enriched with `analyze_ir_domains(...)` and domain-informed scoring

## Rust integration direction

Rust remains the primary semantic/runtime target direction, but projection strategy stays dynamic. Python orchestrates ecosystem-level flow while preserving IR contract boundaries.
