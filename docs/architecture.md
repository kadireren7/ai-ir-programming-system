# Architecture

Torqa is organized as **five layers** from author input to downstream code. This repo implements layers **1–4**; layer **5** is always yours.

## 1. Authoring input

Humans or tools produce **`.tq`** text (strict line format). Legacy **`.pxir`** is still parseable but not recommended for new work. Nothing at this layer executes—it's text.

## 2. Parser

**`torqa.surface`** — `parse_tq_source` reads strings and returns a **bundle** dict (`ir_goal` as JSON-compatible data). Failures are **`TQParseError`** with stable **`PX_TQ_*`** codes. The parser does not validate full IR semantics; it builds the bundle shape.

## 3. Canonical IR

**`torqa.ir.canonical_ir`** — `ir_goal_from_json` turns bundle data into **`IRGoal`** (typed expressions, transitions, metadata). **`CANONICAL_IR_VERSION`** in metadata marks the contract version. **`migrate_ir_bundle`** updates saved JSON when migrations exist.

This layer is **pure data**: no network, no execution.

## 4. Validators

Three layers (CLI runs structural and semantic first; policy only if both succeed):

| Layer | API | Question it answers |
|-------|-----|---------------------|
| Structural | `validate_ir(goal)` | Is the IR well-formed? |
| Semantic | `build_ir_semantic_report(goal, registry)` | Is it coherent under the effect registry and logic rules? |
| Policy + risk | `build_policy_report(goal)` | Trust rules (`policy_ok`) and deterministic **risk** tier + **reasons** ([Trust risk scoring](trust-scoring.md)) |

**`torqa.semantics`** supplies the default registry, logic validation (`ir_logic_validation`), and optional warning policy (`semantic_warning_policy_bundle.json` at repo root). Core **errors** are not disabled by policy.

**`torqa.policy`** implements deterministic trust checks and built-in **profiles**; see [Trust policies](trust-policies.md) and [Trust profiles](trust-profiles.md).

## 5. Handoff layer (external)

**Not in this repository.** Validated **`ir_goal`** JSON (or typed objects) goes to **your** runtime, codegen, or orchestrator. Torqa’s job ends at a **checkable spec**.

## Repository map

```text
spec/IR_BUNDLE.schema.json   # JSON Schema for the bundle envelope
src/torqa/surface/           # .tq / .pxir → bundle
src/torqa/ir/               # IR types, validate_ir, migrate, explain helpers
src/torqa/semantics/        # registry, semantic report, logic checks
src/torqa/policy/           # trust policy report (built-in rules)
src/torqa/cli/              # torqa CLI, bundle load, I/O helpers
tests/                       # End-to-end smoke tests
```

## Continuous integration

There is **no** in-repository GitHub Actions workflow. Run **`pip install -e ".[dev]"`** and **`pytest`** locally (or wire the same commands into your own CI).

---

## Contributor notes

These notes are for **contributors** deciding where to edit. They are not a substitute for reading the code and tests in each area.

| Layer | Location | Expectations |
|-------|----------|--------------|
| **Surface / `.tq`** | `src/torqa/surface/` | Parse errors use stable **`PX_TQ_*`** codes; behavior changes need tests under `tests/`. |
| **Canonical IR** | `src/torqa/ir/` | Wire shape and `CANONICAL_IR_VERSION` are the contract. Changes that alter on-disk JSON usually need a **migration** (`migrate_ir_bundle`) and schema sync (`spec/IR_BUNDLE.schema.json`). Discuss non-trivial changes in an issue first. |
| **Semantics & registry** | `src/torqa/semantics/` | New or changed **effects** affect every spec that references them; keep the default registry small and explicit. |
| **Policy & trust** | `src/torqa/policy/` | Rules stay **deterministic**; align with [Trust policies](trust-policies.md) and [Trust profiles](trust-profiles.md). |
| **CLI** | `src/torqa/cli/` | Exit codes and stream usage (`stdout` vs `stderr`) matter for scripts; extend `tests/test_cli_*.py` when behavior is user-visible. |
| **Bundle / JSON load** | `src/torqa/cli/bundle_load.py`, `io.py` | Error strings often include **path hints**; keep them stable where tests assert substrings. |

**Docs:** If users can observe a change (CLI, JSON acceptance, trust output), update the relevant doc or example.

**Process:** See **[CONTRIBUTING.md](../CONTRIBUTING.md)** at the repository root for setup, tests, and PR expectations. For bite-sized ideas, see **[GOOD_FIRST_ISSUES.md](../GOOD_FIRST_ISSUES.md)**.
