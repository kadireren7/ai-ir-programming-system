# Torqa — early release notes (v0.x)

**Package version:** 0.1.0 (see `pyproject.toml`)

## What Torqa is

Torqa is a **canonical and verifiable workflow specification core** for AI-native automation. It centers on a **versioned JSON intermediate representation** (`ir_goal` in a bundle envelope), **structural validation**, and **semantic checks** against a declared effect registry—so a workflow definition can be **stored, reviewed, diffed, and linted** before anything executes.

This repository ships **spec machinery and reference tooling**, not a workflow runtime.

## What is included now

- **`ir_goal` model**, **canonical IR helpers**, and **`validate_ir`** (structural gate).
- **Semantic reporting** via **`build_ir_semantic_report`** and a **default** function registry (small, explicit vocabulary for the reference path).
- **JSON Schema** for the bundle wire format (`spec/IR_BUNDLE.schema.json`).
- **Strict `.tq` surface** (`tq_v1`): reference parser **`parse_tq_source`** mapping text to the same bundle shape.
- **`meta:`** block support for optional **audit strings** in **`metadata.surface_meta`**.
- **`torqa` CLI** (same pipeline for **`.tq`** and **`.json`**): **`validate`**, **`check`**, **`inspect`**, **`doctor`**, **`explain`**, **`compare`**, **`scan`**, **`report`** (HTML / Markdown), **`init`**, **`version`**. Optional **`torqa.toml`** project defaults; JSON may be a single bundle, bare **`ir_goal`**, or a **batch array** (see [Quickstart](docs/quickstart.md)).
- **Tests** and **documentation** (quickstart, trust docs, CI reports, project config, examples, demos, diagrams, roadmap, [status](docs/status.md)).

## What is intentionally not included

- No **workflow engine**, **orchestrator**, or **hosted service**.
- No **LLM API**, **codegen product**, or **no-code UI**.
- No guarantee of a **large business-step library** in the reference `.tq` surface—the shipped flow vocabulary is **small and strict** by design; extending surfaces and registries is a separate concern.

## Who should try it

- Engineers who want a **checkable contract** between spec authors (human or generated) and downstream execution.
- Teams evaluating **IR + validation** as a gate for **CI** or **review**, independent of a specific runtime.
- Contributors comfortable reading **Python**, **JSON Schema**, and **honest limits** in the docs.

## How to give feedback

- **Issues:** use the repository **Issues** tab for bugs, unclear errors, or documentation gaps. Include: command or API used, minimal input file, actual output, and expected behavior.
- **Design discussion:** reference **`ir_version`**, **`spec/IR_BUNDLE.schema.json`**, and the relevant doc page so feedback stays tied to the contract.
- **Security:** report sensitive concerns privately if your policy requires it; otherwise use Issues with redacted samples.

Feedback on **scope** (what belongs in-core vs. in an executor) is welcome; the project aims to stay a **thin specification core**.

---

## Repository readiness (GitHub)

Suggested **About** text (short description field):

> Canonical workflow IR + validation for AI-native automation. Strict .tq surface, JSON bundle, CLI—spec and checks only, no runtime.

Suggested **topics** (add as repository labels):

`workflow`, `specification`, `intermediate-representation`, `validation`, `json-schema`, `python`, `static-analysis`, `ci`, `automation`, `ai-native`

Suggested **pinned** items (optional):

- **README** — orientation and install path.
- **CHANGELOG.md** — version-to-version changes.
- **docs/flagship-demo.md** — single guided path for new visitors.

Suggested **wiki / discussions:** not required; Issues + PRs are enough for early feedback.
