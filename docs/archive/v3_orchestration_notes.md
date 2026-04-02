# V3 orchestration notes

## Orchestrator contract

`SystemOrchestrator.run()` returns:

- semantic report,
- projection plan,
- projection graph,
- generated artifacts for all selected targets,
- consistency errors list.

This output is JSON-serializable via `orchestrator_to_json(...)`.

## Consistency validation scope

`validate_projection_consistency(...)` currently checks:

- every graph target has an artifact,
- relation types are valid (`depends_on`, `feeds`, `mirrors`),
- artifacts contain expected stub markers.

Future versions can add stricter schema/data-model cross-checking.

## Feedback loop

`refine_ir_with_feedback(...)` now accepts artifacts, execution result, and semantic report to support iterative IR improvement in later versions.

## Rust bridge action shape

Rust bridge supports action payloads in the shape:

```json
{
  "action": "full_pipeline",
  "ir": { "ir_goal": { ... } }
}
```

The current bridge keeps backward compatibility with existing bundle-style payloads.
