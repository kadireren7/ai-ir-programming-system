# AI-generated workflow guardrail

**Main walkthrough:** **[AI Workflow Guardrail Demo](../docs/guardrail-demo.md)** — one end-to-end story (why it matters, good path, bad path, same contract for `.tq` and JSON, team use). Everything below is a short reference; the demo doc is the place to start.

Large language models and other generators can emit workflow-shaped text or JSON quickly. **Execution systems should not consume those bytes as trusted intent** without a shared, deterministic check. Torqa does not generate workflows and does not run them; it **parses** supported inputs (`.tq` or conforming bundle JSON) into canonical IR and runs **structural and semantic validation**—the same path for human-authored or machine-generated content.

## What you run

From the repository root (after `pip install -e ".[dev]"`):

```bash
# Generated or imported bundle JSON (same checks as .tq)
torqa validate examples/ai_generated.json
torqa inspect examples/ai_generated.json
```

```bash
# Strict .tq from an editor or any tool that writes this surface
torqa validate examples/approval_flow.tq
torqa inspect examples/approval_flow.tq
```

```bash
# Fail closed: non-zero exit when the spec is invalid (see guardrail demo for a concrete bad example)
torqa validate path/to/draft.tq
```

Use **`torqa validate` in CI** so bad specs never merge as “the definition of record.” See [`ci_check.md`](ci_check.md) for bash and PowerShell snippets.

## Why this reduces risk

| Without a validation gate | With Torqa first |
|---------------------------|------------------|
| Invalid structure or unknown effects may only surface when a runtime misbehaves or errors opaquely. | **`validate_ir`** and semantic reporting reject inconsistent IR **before** an executor runs. |
| Different consumers each invent partial checks. | One **contract** (`ir_goal` in a versioned bundle) and one validation story in CI and locally. |
| Generated drafts look plausible but may omit required fields or use unsupported steps. | The reference **`.tq`** parser and default registry **fail explicitly** (stable error codes, e.g. `PX_TQ_*` for surface issues)—not silent acceptance. |

Torqa is **not** a substitute for integration tests or operational monitoring; it **front-loads** specification errors so you do not treat unvalidated output as a production workflow definition.

## CLI cues (deterministic)

On **`torqa validate`**, after structural and semantic success the CLI prints **`Trust profile:`** (from **`--profile`**, default **`default`**), then **`Policy validation: PASS`** or **`FAIL`**, **`Review required: yes`** or **`no`**, **`Risk level:`** (`low` / `medium` / `high`), and **`Why:`** with deterministic reason lines, then **`Result: PASS`** and **`Handoff: validated artifact ready for external handoff.`** when policy passes — meaning the spec is OK to treat as input for **your** executor; Torqa still does **not** run the workflow. Risk labels are **heuristic, not ML** ([Trust risk scoring](../docs/trust-scoring.md)); evaluation strictness is selected by profile ([Trust profiles](../docs/trust-profiles.md)). Any failure prints **`Result: FAIL`** and **`Guardrail: spec blocked before execution.`** Required audit fields are documented in [Trust policies](../docs/trust-policies.md).

**`torqa inspect`** keeps **stdout** as JSON only; **stderr** states that stdout is the canonical **`ir_goal`** for tooling, review, and pipelines.

**`torqa doctor`** adds **Readiness** / **Trust** lines under **Summary** so you can see blocked vs handoff-ready under the default registry without parsing JSON.

## Same bar for every source

Whether a file was typed by a person, produced by a template, or serialized from another system, **`torqa validate`** runs **`load` → `ir_goal_from_json` → `validate_ir` → semantics** on the same IR shape. That is the intended **guardrail**: validate first, then hand off a passing artifact to **your** runtime (outside this repository).

See **[AI Workflow Guardrail Demo](../docs/guardrail-demo.md)**, [Starter use cases](../docs/use-cases.md), [Flagship demo](../docs/flagship-demo.md), and [Quickstart](../docs/quickstart.md).
