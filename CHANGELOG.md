# Changelog

All notable changes to this project are documented here. The format is loosely inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-04-16

First early public release of the Torqa core: canonical IR, validation, reference `.tq` surface, CLI, and documentation aimed at technical evaluation.

### Initial public milestones

- Published **versioned IR** (`ir_goal`) with **JSON Schema** (`spec/IR_BUNDLE.schema.json`) and a **reference Python** implementation under `src/`.
- Established **structural** validation (`validate_ir`) and **semantic** reporting (`build_ir_semantic_report`) as the shared product boundary; execution remains out of scope.

### Parser hardening

- Strict **`tq_v1`** parsing with deterministic mapping to bundle JSON, stable **error codes** (e.g. `PX_TQ_*`), and explicit rules for headers, `flow:` steps, and optional constructs documented in [Concepts](docs/concepts.md).

### CLI

- Introduced the **`torqa`** command: **`validate`**, **`inspect`**, **`doctor`**, **`version`** — load → `ir_goal_from_json` → `validate_ir` → semantic checks, with no execution engine.

### JSON input support

- **`torqa`** accepts **`.json`** as well as **`.tq`**: full bundle (`ir_goal` + optional `library_refs`) or bare **`ir_goal`** where allowed, with the same validation path as text input.

### Flagship demo

- Added **[Flagship demo](docs/flagship-demo.md)** — one guided story (`.tq` and JSON, same contract) for reviewers new to the project.

### Metadata block support

- Optional **`meta:`** block in `.tq` for **audit / ownership** strings carried into **`metadata.surface_meta`** (see [Examples](docs/examples.md)); does not alter effect semantics.

---

Earlier development history is folded into this release for clarity; subsequent versions will list incremental changes here.
