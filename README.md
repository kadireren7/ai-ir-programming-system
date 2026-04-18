# Torqa

**Torqa is a canonical, verifiable workflow specification core with a built-in workflow trust layer.**

Human-authored or **generated** workflow specs should **not** be executed blindly. Torqa **validates** structure and semantics, then **trust-checks** and **risk-scores** the same canonical **`ir_goal`**—deterministic **policy** rules, **risk** tier and **reasons**, and optional **trust profiles** (`default` / `strict` / `review-heavy` via **`--profile`**) so teams can apply different **evaluation strictness** without forking the parser. **Execution stays external**: this repository does not run your workflows, call remote APIs, or embed a model.

**Torqa Core** is the **versioned JSON intermediate representation** (`ir_goal` in a bundle) plus **structural validation**, **semantic validation**, and **`build_policy_report`** (policy, risk, profile id)—a single **contract** you can store, diff in review, run in CI, and hand off to other systems. The shipped **reference parser** maps strict **`.tq`** to that bundle; bundle JSON from importers or generators targets the **same** contract.

## Get started

**Install** (from a clone of this repository):

```bash
pip install -e ".[dev]"
```

If the `torqa` command is not found (common on Windows when Python’s **Scripts** folder is not on `PATH`), run the same CLI with **`python -m src.torqa_cli`** from the repo root—for example `python -m src.torqa_cli validate demo.tq`. See [Quickstart](docs/quickstart.md#if-torqa-is-not-found-often-on-windows).

Then:

1. **[First run](docs/first-run.md)** — Shortest path: two files, one command, what “success” looks like.  
2. **[Quickstart](docs/quickstart.md)** — CLI (`torqa`), parse, validate, trust output.  
3. **[Examples](docs/examples.md)** — Patterns (CI, imports, audit metadata).  
4. **[CHANGELOG](CHANGELOG.md)** — What shipped in each version.  
5. **[Early release notes](RELEASE_NOTES_v0.md)** — Scope, limits, and how to give feedback.

## Flagship Demo

**[Flagship demo](docs/flagship-demo.md)** — Draft (human or tool-produced) → **`torqa validate`** → trusted **`ir_goal`** artifact → hand off to **external** execution—same contract whether input is `.tq` or bundle JSON, no runtime in-repo.

## AI Guardrail Demo

**[AI Workflow Guardrail Demo](docs/guardrail-demo.md)** — End-to-end: valid vs broken specs, **policy / risk / profiles**, **`torqa validate`** / **`torqa inspect`**, same gate for **`.tq`** and JSON. No fake integrations—only shipped CLI and examples.

## Starter use cases

**[Use cases](docs/use-cases.md)** — **`examples/`** walkthrough: **AI workflow trust gate** first, then **CI, review, and policy-based approval**. **[`examples/ai_guardrail.md`](examples/ai_guardrail.md)** lists commands and trust framing.

## Architecture at a Glance

Pipeline, in-repo vs external boundaries, and comparison visuals: **[Diagrams](docs/diagrams.md)**.

## Why Torqa exists

Workflow intent shows up as prose, one-off JSON, vendor-locked formats, or **model-generated drafts**. Torqa concentrates **verification** and **trust** on a **canonical IR**: explicit structure and semantics, then **policy** and **risk**—so bad or non-compliant specs fail **before** execution. **[Trust layer](docs/trust-layer.md)** explains how this goes beyond parsing.

## The core workflow

1. **Obtain a bundle** — Parse **`.tq`** with the reference parser, or load **`ir_goal` JSON** (importer, template, or **generator**). One contract for every source.
2. **Canonical IR** — **`ir_goal`**: typed inputs, conditions, transitions, metadata (including **`ir_version`**).
3. **Structural validation** — `validate_ir` rejects malformed or inconsistent IR before semantics.
4. **Semantic validation** — Default effect registry and workflow logic (`semantic_ok` / `logic_ok`).
5. **Trust evaluation** — **`build_policy_report`**: **`policy_ok`**, **`review_required`**, deterministic **`risk_level`** and **`reasons`**, **`trust_profile`** from **`--profile`**. Heuristics are not ML.
6. **Handoff** — Validated IR for **your** executor, orchestrator, or codegen—**outside** this repo.

## What Torqa is

- **The contract:** canonical **`ir_goal`** + validation + **trust** (policy, risk, profiles) for portable, reviewable workflow specs.
- **Trust and portability:** one IR shape and schema-backed wire format; teams can agree what “passes” means under a chosen **profile**.
- **Reference tooling:** **`canonical_ir`**, **`validate_ir`**, **`build_ir_semantic_report`**, **`build_policy_report`**, **`spec/IR_BUNDLE.schema.json`**, optional **`.tq` → bundle** parser.

## What Torqa is not

- Not a **workflow runtime**, **orchestration engine**, or **no-code / low-code UI**.
- Not a **hosted service**, **IDE product**, or **LLM API**.
- Not limited to a single file format for all time—the **core** is IR + checks + trust evaluation; **`.tq`** is one supported authoring path today.

## Why Now

More automation is **generated** and **composed across tools**; teams need **reviewable** definitions and **trust gates**, not only faster runtimes. **[Why now?](docs/why-now.md)** — including why **syntax-only** checks are insufficient for **AI-generated** workflows.

## Minimal example (`.tq` → validate)

`example.tq` (include **`meta:`** for **`torqa validate`** — policy expects owner and severity; see [Trust policies](docs/trust-policies.md)):

```text
intent example_flow
requires username, password, ip_address
meta:
  owner example_owner
  severity low
result Done
flow:
  create session
  emit login_success
```

```python
from pathlib import Path

from src.surface.parse_tq import parse_tq_source
from src.ir.canonical_ir import ir_goal_from_json, validate_ir
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

bundle = parse_tq_source(
    Path("example.tq").read_text(encoding="utf-8"),
    tq_path=Path("example.tq"),
)
goal = ir_goal_from_json(bundle)
assert validate_ir(goal) == []
report = build_ir_semantic_report(goal, default_ir_function_registry())
assert report.get("semantic_ok") is True
```

The **same** `validate_ir` / semantic steps apply if you construct or import a conforming **`ir_goal`** without `.tq`. Full **CLI** trust output requires **`torqa validate`** (see [Quickstart](docs/quickstart.md)).

## Why this matters when specs are generated

Volume-generated content needs the **same** structural and semantic gates **plus** **policy** and **risk** before handoff. Torqa anchors trust in the spec layer—**audit metadata**, **profiles**, deterministic **reasons**—independent of any single runtime. Nothing here calls an LLM.

## Current project status

**Early core (v0.x).** Python modules under `src/`, `spec/IR_BUNDLE.schema.json`, and tests. For new text authoring use **`.tq`**; a transitional **`.pxir`** parser remains for migration only. The **`torqa`** CLI accepts **`.tq` or `.json`** on one path. In scope: **IR**, validation, **trust** evaluation—not execution.

## Documentation

- [Overview](docs/overview.md) — scope and positioning  
- [Trust layer](docs/trust-layer.md) — workflow trust layer (policy, risk, profiles)  
- [Starter use cases](docs/use-cases.md) — `examples/` walkthrough  
- [Flagship demo](docs/flagship-demo.md) — one guided `.tq` / JSON path  
- [AI Workflow Guardrail Demo](docs/guardrail-demo.md) — guardrail + trust walkthrough  
- [Why now?](docs/why-now.md) — context and who benefits  
- [First run](docs/first-run.md) — minimal successful run  
- [Quickstart](docs/quickstart.md) — install, CLI, validate  
- [Concepts](docs/concepts.md) — IR, validation, `.tq` surface  
- [Trust policies](docs/trust-policies.md) — validation vs semantics vs policy  
- [Trust risk scoring](docs/trust-scoring.md) — deterministic risk tier and reasons  
- [Trust profiles](docs/trust-profiles.md) — built-in evaluation modes (`default`, `strict`, `review-heavy`)  
- [Examples](docs/examples.md) — CI, metadata, migration patterns  
- [Architecture](docs/architecture.md) — layout and pipeline  
- [Diagrams](docs/diagrams.md) — core flow and boundaries  
- [Roadmap](docs/roadmap.md) — limits and direction  
- [FAQ](docs/faq.md)  
- [CHANGELOG](CHANGELOG.md) — version history  
- [Early release notes](RELEASE_NOTES_v0.md) — v0.x scope and feedback  

## Design principles

- **Canonical IR first** — One **`ir_goal`** shape (versioned bundle) as the interchange **contract**.
- **Validation and trust as gates** — Structure, semantics, policy, and risk are deliberate; outcomes are visible in APIs and CLI output.
- **Portability** — IR is **runtime-agnostic**; execution stays outside this layer.
- **Optional ergonomic authoring** — **`.tq`** is strict so text maps deterministically to IR when you use it.
- **No silent ambiguity** — Invalid or unknown constructs surface as errors with stable codes (e.g. `PX_TQ_*` for surface parse), not best-effort acceptance.
- **Thin core** — Verifiable spec and trust machinery, not a platform.

## License

[MIT](LICENSE)
