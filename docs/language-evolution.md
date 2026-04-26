# Language Evolution

## Why this exists

Today’s **`.tq`** surface is **intentionally small**: a strict header order, a narrow `flow:` vocabulary in **strict `tq_v1`**, and deterministic mapping to **canonical IR**. That keeps the core **auditable and testable**.

Real workflows—approvals, branching, reusable playbooks—often need **more authoring expressiveness** without giving up **determinism**, **stable errors**, or a **clean IR mapping**. This document frames **gaps**, **constraints**, and **possible** directions. Nothing here is a committed feature list.

## Current surface supports

What the reference parser actually implements today (see `src/torqa/surface/parse_tq.py`):

- **Strict `tq_v1`:** Fixed header sequence (`module` optional, `intent`, `requires`, optional `forbid locked`, optional `ensures session.created`, `result`, `flow:`). Lowercase keywords only.
- **Flow body (strict):** Exactly two spaces + **`create session`** or **`emit login_success`**, or guarded **`emit login_success when/if <ident>`**. At most one create and one emit in the common profile; `#` comments allowed inside `flow:`.
- **Includes:** After `intent`, `include "relative/path.tq"` (double quotes, order preserved); expansion is traced in metadata.
- **`stub_path`:** Optional lines after `requires` for downstream projection hints (`metadata.source_map.projection_stub_paths`); ignored by core semantics.
- **Optional `torqa_rich v0`:** Richer blocks (`model:`, `validate:`, `effects:`, structured flow trees) layered on the same header discipline—narrower audience, same IR destination.
- **Transitional `.pxir`** in `parse_pxir.py` for legacy material—not the long-term authoring path.

Parsing failures use **stable codes** (e.g. `PX_TQ_*`). Output is always a **JSON bundle** with **`ir_goal`** for structural and semantic validation.

## Real-world gaps discovered

Teams often hit limits that are **not** failures of the core idea—only of how much surface is exposed yet:

- **Multi-step approval flows** — More than one business-meaningful transition in order (beyond the current strict two-step demo vocabulary).
- **Branching conditions** — Explicit forks (e.g. approve vs reject paths) with predictable guards, not ad-hoc prose.
- **Richer actions** — Named effects that map 1:1 to registry entries, without inventing a full scripting language.
- **Reusable patterns** — Shared fragments (includes help; libraries or templates may need clearer story).
- **Metadata / annotations** — Provenance, owners, SLAs, or policy tags carried in IR for audit and tooling.

These gaps should be closed **incrementally** with versioned grammar and IR migrations—not by turning `.tq` into a grab-bag.

## Design constraints

Any evolution should respect:

- **Small grammar** — Few constructs, each with a clear IR equivalent.
- **Deterministic parsing** — Same file → same IR; no ambiguous resolution.
- **Stable diagnostics** — Error codes and messages remain reviewable in CI.
- **Human-readable** — PR-friendly text, not binary or opaque macros.
- **Easy IR mapping** — Every syntactic form maps to explicit `ir_goal` data; no “magic” behavior in the parser.
- **No hidden magic** — Side effects, defaults, or implicit steps are out of scope for the language itself (execution stays external).

## Candidate future additions

*Possibilities, not promises.* Each would need a proposal, tests, schema/IR updates, and a version bump.

1. **Named steps** — User-facing labels or effect references per line so multi-step flows read as more than the current strict demo pair, still bound to the registry.
2. **Conditional branches** — Structured `if` / `when` (or equivalent) with a finite rule set and explicit IR branches.
3. **Structured actions** — Arguments and effect names in a regular pattern (aligned with `IRFunctionSignature`), not free-form code.
4. **Metadata blocks** — Small, optional keyed sections that serialize into `metadata` or well-defined IR fields for audit and tooling.
5. **Reusable templates** — Builds on `include` and/or library refs with clearer composition rules and versioning.
6. **Better diagnostics** — Richer messages and suggestions while keeping **codes** stable for automation.

## What Torqa should never become

- A **general-purpose programming language** (loops-as-Turing-complete, arbitrary computation in specs).
- A **runtime engine** (execution, retries, I/O) embedded in the language.
- An **ambiguous natural-language parser** (“do what I mean” without a formal tree).
- A **giant DSL** with endless syntax churn and unclear IR mapping.

## Suggested strategy

Prefer **incremental surface versions** with explicit markers in source and metadata:

- **`tq_v1`** — Current strict baseline; preserve compatibility for existing files.
- **`tq_v1.1`** (or similar) — Additive, backward-compatible changes where possible (new optional headers, extra step forms) with clear migration notes.
- **`tq_v2`** — Only when a **breaking** cleanup is justified (rename keywords, restructure flow) and **migrations** + docs are ready.

Pair surface bumps with **`ir_version`** / `migrate_ir_bundle` when IR shape changes. Favor **small releases** over big-bang rewrites.

## Why restraint matters

Small, stable languages tend to become **strong standards**: implementers can rely on a **finite** grammar, reviewers see the same patterns in every PR, and tools (diff, CI, codegen) stay maintainable. Every new construct should **earn its place** by mapping cleanly to IR and validation. Restraint is not lack of ambition—it is how a **specification core** stays trustworthy while execution ecosystems change around it.
