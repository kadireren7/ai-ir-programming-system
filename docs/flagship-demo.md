# Flagship Demo

## Why this demo exists

Torqa’s core is not a runtime—it is a **checkable contract** between whoever authors a workflow (human, generator, or importer) and whatever executes it later. This demo walks the **intended wedge** in order:

1. **Draft** — Author `.tq` or produce bundle JSON (in production, that draft might come from an AI-assisted tool or another system; here you write or export files locally).
2. **Validate** — `torqa validate` runs the same structural and semantic checks for `.tq` or JSON.
3. **Trusted artifact** — On success, the canonical **`ir_goal`** (and bundle envelope) is what you **treat as the definition** for review, CI, and downstream tooling.
4. **External execution** — Your runtime, queues, or integrations consume **that** validated spec; this repository does not execute business steps.

Everything below uses **only** behavior shipped in this repository: strict `.tq`, bundle JSON, the `torqa` CLI, and the default semantic checks. **No LLM calls, no external APIs, no in-repo runtime.**

## Scenario

**Story:** When a new lead is captured, open a tracked session, record a success signal, and attach **ownership** and **risk** metadata for downstream review.

**What the reference surface actually does today:** The strict `tq_v1` flow body only allows **`create session`** and **`emit login_success`** (plus optional guards). The `requires` header must include **`password`** (and a primary login field such as **`username`**) because the reference parser maps those to structured preconditions—this is login-shaped, not a full CRM vocabulary. **`meta:`** lines are the supported way to carry **audit strings** (for example owner and severity) into **`metadata.surface_meta`** without pretending they change effects. The scenario is expressed in business terms; the syntax matches what the parser accepts **now**.

## Path A — `.tq` authoring

Save as `lead_intake.tq` (two ASCII spaces before each flow step):

```text
intent lead_intake
requires username, password, ip_address
meta:
  owner sales_ops
  severity high
result Done
flow:
  create session
  emit login_success
```

Commands:

```bash
torqa validate lead_intake.tq
torqa inspect lead_intake.tq
```

**What you should see**

- **`torqa validate`** prints `Input type`, `File:`, then `Parse: OK`, structural/semantic/logic lines, **`Policy validation: PASS`**, **`Review required:`** (`yes` when `meta:` has **`severity high`**, else `no`), `Result: PASS`, and **`Handoff: validated artifact ready for external handoff.`** when the default registry and policy accept the spec. Failures add **`Guardrail: spec blocked before execution.`**
- **`torqa inspect`** writes `Input type`, `File:`, and stderr lines explaining that **stdout** is the full canonical **`ir_goal` JSON** (sorted keys) for tooling, review, and pipelines — **no execution**. **Stdout** remains JSON only. Parsed metadata includes `surface_meta` with `owner` and `severity` when present in `.tq`.

## Path B — JSON bundle input

Path B is the **same** contract: either a full bundle `{"ir_goal": …}` or a bare top-level `ir_goal` object, as described in `spec/IR_BUNDLE.schema.json` and [Quickstart](quickstart.md).

**Practical way to get an equivalent bundle:** parse the same `.tq` and write JSON (from the repo root after `pip install -e ".[dev]"`):

```python
import json
from pathlib import Path

from src.surface.parse_tq import parse_tq_source

text = Path("lead_intake.tq").read_text(encoding="utf-8")
bundle = parse_tq_source(text, tq_path=Path("lead_intake.tq"))
Path("lead_intake.json").write_text(json.dumps(bundle, indent=2), encoding="utf-8")
```

Commands:

```bash
torqa validate lead_intake.json
torqa inspect lead_intake.json
```

**What you should see**

- **`torqa validate`** prints `Input type: json`, `Load: OK`, then the same structural, semantic, **policy**, and **Handoff** / **Guardrail** lines as Path A when the bundle matches the parsed result.
- **`torqa inspect`** uses the same stderr/stdout split as Path A; JSON on **stdout** is the full artifact, not a summary.

You can also construct or export `ir_goal` from another tool; if it passes **`validate_ir`** and semantics for the registry you use, **`torqa validate`** behaves the same.

## What Torqa proves

- **Draft → validate → artifact** — The demo is the minimal pipeline: produce input, run **`torqa validate`**, use **`torqa inspect`** or saved JSON when you need the canonical **IR** for handoff.
- **Same contract** — Whether the input is `.tq` or JSON, the CLI normalizes to **`ir_goal`** and runs the same checks.
- **Same checks** — Structural (`validate_ir`) and default **semantic** reporting (`build_ir_semantic_report`) run on that IR.
- **Syntax is optional** — `.tq` is an ergonomic surface; JSON (bundle or bare goal) is a first-class input—**including paths where a model or tool emitted JSON** you saved to disk.
- **Validation is the gate** — Failure is explicit (non-zero exit, error details on stderr or in the report); nothing here executes side effects.
- **Execution is external** — This repo does not run your CRM, queues, or integrations; it produces a **verified spec** for something else to consume.

## Why this matters

- **Guardrail for generated workflows** — Text or JSON from a generator can be rejected **before** any runtime sees it; humans and generators meet the **same** bar.
- **Reviewable specs** — IR and metadata are stable artifacts for diff and review.
- **Portable definitions** — One envelope shape can move between tools that agree on the contract.
- **CI-friendly usage** — `torqa validate` on checked-in `.tq` or bundle JSON fits standard lint pipelines.

## Broken input (expected failure)

The strict flow body does not accept arbitrary step names. For example, `bad_lead_intake.tq`:

```text
intent lead_intake
requires username, password, ip_address
result Done
flow:
  create session
  notify lead
```

```bash
torqa validate bad_lead_intake.tq
```

**Expected failure mode:** exit code **1**, with a **structural `.tq` parse** error (for example code `PX_TQ_UNKNOWN_FLOW_STEP`) and a message that only **`create session`** / **`emit login_success`** (and guarded variants) are allowed. Nothing is wrong with your *intent*—the reference surface simply rejects unsupported steps, which is what you want before execution.
