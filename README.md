# Torqa

**Torqa is a canonical and verifiable workflow specification core for AI-native automation.**

**Torqa Core** is the **versioned JSON intermediate representation** (`ir_goal` in a bundle) plus **structural and semantic validation**—a single **contract** you can store, diff in review, run in CI, and hand off to other systems. This repository ships the **IR model**, **validators**, **JSON Schema**, and a **reference Python** implementation; it does not execute workflows.

**`.tq`** is an **optional, ergonomic text layer** for authoring that maps to the same bundle. The shipped **reference parser** turns strict `.tq` into IR; bundle JSON from your own importer targets the **same** contract—**validation is the shared gate** either way.

## Get started

**Install** (from a clone of this repository):

```bash
pip install -e ".[dev]"
```

Then:

1. **[First run](docs/first-run.md)** — Shortest path: two files, one command, what “success” looks like.  
2. **[Quickstart](docs/quickstart.md)** — CLI (`torqa`), parse, validate, semantic report.  
3. **[Examples](docs/examples.md)** — Patterns (CI, imports, audit metadata).  
4. **[CHANGELOG](CHANGELOG.md)** — What shipped in each version.  
5. **[Early release notes](RELEASE_NOTES_v0.md)** — Scope, limits, and how to give feedback.

## Flagship Demo

**[Flagship demo](docs/flagship-demo.md)** — One end-to-end story: author `.tq` or JSON, validate with `torqa`, and treat the checked IR as the handoff artifact (same contract, no runtime in-repo).

## Architecture at a Glance

Pipeline, in-repo vs external boundaries, and comparison visuals: **[Diagrams](docs/diagrams.md)**.

## Why Torqa exists

Workflow intent shows up as prose, one-off JSON, or vendor-locked formats. That makes it hard to **verify** the same definition everywhere, **diff** or **review** it as a **contract**, or **hand it off** cleanly to whatever runtime you use. Torqa puts **trust** in a **canonical IR** and **explicit validation**—not in ad-hoc blobs—so bad specs fail before execution, with stable semantics you can rely on across tools.

## The core workflow

1. **Obtain a bundle** — Today: parse **`.tq`** with the reference parser, or load **`ir_goal` JSON** that matches the envelope (your importer or generator is responsible for shape). Additional input paths may be added over time; they still converge on the **same** validated IR.
2. **Canonical IR** — **`ir_goal`**: typed inputs, conditions, transitions, metadata (including **`ir_version`**).
3. **Structural validation** — `validate_ir` rejects malformed or inconsistent IR before semantics.
4. **Semantic validation** — A default effect registry and workflow logic checks produce a report (`semantic_ok` / errors); unknown effects and impossible stories are **errors**, not silent acceptance.
5. **Handoff** — Validated IR is the artifact for **your** executor, orchestrator, or codegen—outside this repo.

## What Torqa is

- **The contract:** canonical **`ir_goal`** + **validation** (structural + semantic) for portable, reviewable workflow specs.
- **Trust and portability:** one IR shape and schema-backed wire format so different teams and tools can agree on what “valid” means.
- **Reference tooling in this repo:** **`canonical_ir`**, **`validate_ir`**, **`build_ir_semantic_report`**, **`spec/IR_BUNDLE.schema.json`**, and an optional **`.tq` → bundle** parser for human-friendly authoring.

## What Torqa is not

- Not a **workflow runtime**, **orchestration engine**, or **no-code / low-code UI**.
- Not a **hosted service**, **IDE product**, or **LLM API**.
- Not limited to a single file format for all time—the **core** is IR + checks; **`.tq`** is one supported authoring path today.

## Why Now

More automation is **generated** and **composed across tools**; teams need **reviewable** process definitions and **safer handoff** to execution—not only faster runtimes. **[Why now?](docs/why-now.md)** lays out that shift and the **specification gap** Torqa addresses—without overselling the current core.

## Minimal example (`.tq` → validate)

`example.tq`:

```text
intent example_flow
requires username, password, ip_address
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

The **same** `validate_ir` / semantic steps apply if you construct or import a conforming **`ir_goal`** without `.tq`.

## Why this matters for AI-native automation

Models and templates can emit content at volume; without a **canonical, checkable IR**, every consumer reinvents validation or accepts inconsistent JSON. Torqa anchors **trust** in the spec: explicit structural and semantic gates, and an IR you can **audit** independent of any single runtime or authoring surface.

## Current project status

**Early core (v0.x).** Python modules under `src/`, `spec/IR_BUNDLE.schema.json`, and tests. For new text authoring use **`.tq`**; a transitional **`.pxir`** parser remains for migration only. The **`torqa`** CLI accepts **`.tq` or `.json`** (bundle or bare `ir_goal`) on one validation path. In scope: **IR**, validation, reference loaders—not execution.

## Documentation

- [Overview](docs/overview.md) — scope and positioning  
- [Flagship demo](docs/flagship-demo.md) — one guided `.tq` / JSON path  
- [Why now?](docs/why-now.md) — context and who benefits  
- [First run](docs/first-run.md) — minimal successful run  
- [Quickstart](docs/quickstart.md) — install, CLI, validate  
- [Concepts](docs/concepts.md) — IR, validation, `.tq` surface  
- [Examples](docs/examples.md) — CI, metadata, migration patterns  
- [Architecture](docs/architecture.md) — layout and pipeline  
- [Diagrams](docs/diagrams.md) — core flow and boundaries  
- [Roadmap](docs/roadmap.md) — limits and direction  
- [FAQ](docs/faq.md)  
- [CHANGELOG](CHANGELOG.md) — version history  
- [Early release notes](RELEASE_NOTES_v0.md) — v0.x scope and feedback  

## Design principles

- **Canonical IR first** — One **`ir_goal`** shape (versioned bundle) as the interchange **contract**.
- **Validation as the product gate** — Structure and semantics are checked deliberately; outcomes are visible in APIs and reports.
- **Portability** — IR is **runtime-agnostic**; execution stays outside this layer.
- **Optional ergonomic authoring** — **`.tq`** is strict so text maps deterministically to IR when you use it.
- **No silent ambiguity** — Invalid or unknown constructs surface as errors with stable codes (e.g. `PX_TQ_*` for surface parse), not best-effort acceptance.
- **Thin core** — Verifiable spec machinery, not a platform.

## License

[MIT](LICENSE)
