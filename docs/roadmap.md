# Roadmap

Planning for an **early core**: small API surface, reference Python implementation, no product wraparound. Nothing below is a release promise—it's how work tends to cluster.

## Current focus

- **Stable parse → IR → validate** path for `.tq` and the JSON bundle.
- **Default semantic registry** kept small and explicit: unknown effects stay **errors**.
- **Tests + schema** (`spec/IR_BUNDLE.schema.json`) as the baseline contract checks.
- **Documentation** aligned with what the code actually does.

## Near-term improvements

- Clearer **error text** where parser vs. structural vs. semantic failures differ.
- **Examples** that track real parser capabilities (including rich `.tq` where implemented).
- **Tighter docs** when IR or registry behavior changes—version bumps remain visible via `ir_version` and `migrate_ir_bundle` when migrations land.

## Long-term possibilities

*Only directions that fit “spec core,” not a platform.*

- Incremental evolution of the **`.tq` authoring surface** and expressiveness—constraints, gaps, and candidate directions (not commitments): see [Language evolution](language-evolution.md).
- Additional **IR migrations** as the model evolves.
- Optional **alternative front-ends** that still emit the same bundle (same validation story).
- Stronger **interop tooling** (e.g. lint/format helpers) **if** they stay thin and test-backed.

These depend on maintainers and contributors; they are not implied ship dates.

## Explicit non-goals

- **Workflow runtime** (execution, retries, scheduling UI).
- **No-code / orchestration product** or **hosted SaaS** in this repo.
- **Vendor-specific codegen** or **LLM products** bundled with the core.
- **Silent weakening** of validation (e.g. accepting unknown effects by default).

Validated IR may feed any external system; **building that system is out of scope** unless the project charter changes explicitly.
