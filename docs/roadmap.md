# Roadmap

Planning for an **early core**: small API surface, reference Python implementation, no product wraparound. **Nothing here is a release promise** — it is how work tends to cluster, so visitors and contributors can align expectations.

## Snapshot for visitors

| You want… | Torqa today |
| --- | --- |
| A **CI gate** before workflows run | **`torqa validate` / `torqa scan`**, JSON output, [GitHub Action](github-actions.md) |
| **One contract** for `.tq` and JSON bundles | **`ir_goal`** + `spec/IR_BUNDLE.schema.json` |
| **Trust signals** without ML inside the core | **Profiles** + deterministic policy / risk / reasons |
| A **runtime or hosted runner** | **Out of scope** for this repository (see [non-goals](#explicit-non-goals)) |

**Adoption path:** clone → [README — 2-minute quickstart](https://github.com/kadireren7/Torqa#2-minute-quickstart) → wire `torqa` into CI → (optional) [dashboard](https://github.com/kadireren7/Torqa/tree/main/dashboard) + [cloud schema](cloud-backend.md) when you need teams.

---

## Current focus

- **Stable parse → IR → validate** path for `.tq` and the JSON bundle.
- **Default semantic registry** kept small and explicit: unknown effects stay **errors**.
- **Tests + schema** (`spec/IR_BUNDLE.schema.json`) as the baseline contract checks.
- **Documentation** aligned with what the code actually does — README, examples, and issue templates should stay honest.
- **v0.1.4 release track:** reliability hardening for n8n/automation governance (engine transparency, schedule execution MVP, stronger deterministic findings), not broad adapter/platform expansion.
- **v0.1.5 release track:** adoption + DX + public trust (one-command quickstart, shareable reports, onboarding polish, consistent public API envelopes).

---

## Near-term improvements

- Clearer **error text** where parser vs. structural vs. semantic failures differ.
- **Examples** that always track real parser capabilities (including richer `.tq` where implemented).
- **Tighter docs** when IR or registry behavior changes — version bumps remain visible via `ir_version` and `migrate_ir_bundle` when migrations land.
- **Packaging & discovery** — PyPI presence, badges, and “first success in 2 minutes” kept current as the CLI evolves.

---

## Milestones (directional)

| Milestone | Meaning |
| --- | --- |
| **0.x** | Rapid iteration; breaking CLI / diagnostics allowed with changelog discipline. |
| **1.0.0** | **Stability story** for the public CLI + bundle contract; see [status](status.md) for gaps. |
| **Post-1.0** | Optional migrations, richer `.tq`, interop tooling — still **thin core** unless the charter changes. |

---

## Long-term possibilities

*Only directions that fit “spec core,” not a platform.*

- Incremental evolution of the **`.tq` authoring surface** — constraints and candidates: [Language evolution](language-evolution.md).
- Additional **IR migrations** as the model evolves.
- Optional **alternative front-ends** that still emit the same bundle (same validation story).
- Stronger **interop tooling** (e.g. lint/format helpers) **if** they stay thin and test-backed.

These depend on maintainers and contributors; they are **not** implied ship dates.

---

## Explicit non-goals

- **Workflow runtime** (execution, retries, scheduling UI).
- **No-code / orchestration product** or **hosted SaaS** in this repo.
- **Vendor-specific codegen** or **LLM products** bundled with the core.
- **Silent weakening** of validation (e.g. accepting unknown effects by default).

Validated IR may feed any external system; **building that system is out of scope** unless the project charter changes explicitly.
