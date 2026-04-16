# Public Launch Kit

Internal reference for sharing Torqa publicly. **Torqa** is a canonical and verifiable workflow specification core for AI-native automation—not a runtime or platform.

---

## GitHub Repository Description

Five alternatives (each ≤ 160 characters for short repo taglines / bios):

1. **Canonical workflow spec core: `.tq` → JSON IR, structural + semantic validation. Reference Python impl. Not a runtime.** (119 chars)

2. **Verifiable workflow specifications for AI-native automation. Parse `.tq` to canonical IR, validate before execution. Open source, MIT.** (115 chars)

3. **Small language + IR for workflow intent: deterministic parsing, `validate_ir`, semantic reports. Hand off validated specs to your own executor.** (132 chars)

4. **Torqa: human-readable `.tq` workflows compile to versioned JSON (`ir_goal`). Schema-backed, CI-friendly. Early-stage spec core.** (118 chars)

5. **Specification layer between authors (human or generated) and runtimes: one contract, explicit errors, portable IR. Python reference + JSON Schema.** (127 chars)

---

## GitHub Topics

Fifteen tags (avoid misleading ones such as `workflow-engine`—Torqa is not an engine):

`workflow` · `automation` · `specification` · `dsl` · `intermediate-representation` · `validation` · `json-schema` · `python` · `parser` · `declarative` · `open-source` · `developer-tools` · `static-analysis` · `ci` · `governance`

---

## One-line Elevator Pitch

Ten alternatives:

1. Torqa turns workflow text into a canonical, validated IR so execution systems get a spec that was checked first—not guessed.
2. A minimal spec core: `.tq` in, versioned JSON IR out, structural and semantic validation in the middle.
3. Workflow intent as a real contract—parseable, lintable, and portable—without bundling a runtime.
4. For teams that want one place to define “what the automation is” before anything runs.
5. Deterministic parsing plus explicit validation gates between authors (including LLMs) and your executors.
6. Canonical workflow IR with JSON Schema and a reference Python validator—early core, MIT-licensed.
7. Replace ad-hoc JSON blobs with a small language and checks you can run in CI.
8. AI-native in the boring sense: the same checkable artifact for human edits and generated drafts.
9. Specification layer only: if you need execution, you bring it; Torqa supplies the verifiable definition.
10. Small surface, clear errors, stable bundle shape—workflow specs you can review and diff like code.

---

## Short Social Post (X / Twitter)

Five variations (under typical length; adjust for your handle / link):

1. **Shipped an early open-source core:** Torqa—workflow specs as `.tq` → canonical JSON IR + structural/semantic validation. Not a runtime; meant for review + CI before execution. MIT. [link]

2. **Problem:** generated + fragmented workflow definitions are hard to validate consistently. **Approach:** tiny `.tq` surface, versioned `ir_goal`, `validate_ir` + semantic reports. Torqa is that layer—reference Python, no hype.

3. **If you’re tired of “JSON that might mean anything,”** we’re experimenting with a strict spec path: parse → IR → validate → hand off. Torqa. Early days; feedback welcome.

4. **Workflow automation needs a contract, not only a scheduler.** Torqa is a spec + validation core for AI-adjacent automation (canonical IR, schema, CI-friendly). Execution stays yours.

5. **Open source:** Torqa—verifiable workflow specifications (`.tq`, JSON bundle, semantic checks). Positioning is intentionally thin: no platform, no LLM bundled. Docs + diagrams in repo.

---

## Hacker News Submission Titles

Ten honest, technical titles (no vanity metrics):

1. Show HN: Torqa – canonical workflow IR from `.tq` with structural and semantic validation (Python core)
2. Torqa: a small workflow specification language and JSON IR—not a runtime
3. Show HN: Verifiable workflow specs (`.tq` → `ir_goal`) for automation before execution
4. Torqa – reference implementation of a workflow spec layer with JSON Schema and CI-friendly validation
5. A specification core for workflow automation: parse, validate, hand off (early MIT project)
6. Show HN: Torqa – deterministic `.tq` parsing and IR validation for AI-assisted workflow authoring
7. Torqa: workflow intent as a versioned bundle with explicit validation errors
8. Open source workflow spec core – canonical IR, no bundled executor
9. Show HN: Thin layer between workflow authors and runtimes (Torqa, Python + schema)
10. Torqa – `.tq` surface and semantic checks over a canonical JSON intermediate representation

---

## Reddit Post Angles

Five subreddit-friendly angles (adapt tone per community rules):

1. **r/golang / r/rust / language fans:** “We’re using a small external DSL (`.tq`) that compiles to JSON IR with validation—interested in how others design spec languages without growing a full runtime.”

2. **r/devops / r/sysadmin:** “Exploring a git-friendly workflow *spec* format with CI validation before anything hits an orchestrator—Torqa as the contract layer.”

3. **r/LocalLLaMA / r/MachineLearning (carefully):** “For generated automation drafts, we wanted a canonical target with deterministic parse + validation; sharing an early open-source core (not an LLM product).”

4. **r/opensource:** “New MIT project: reference implementation for verifiable workflow specifications—feedback on scope and docs welcome.”

5. **r/ExperiencedDevs / r/softwarearchitecture:** “Separation of workflow *definition* from *execution*: one IR, explicit validators—early-stage OSS, looking for critique of the model.”

---

## Who Should Care

- Engineers who **own automation standards** inside an org.
- Teams mixing **human-authored** and **generated** workflow text who need a **single checkable target**.
- **Platform** and **internal tools** groups defining handoff between products and executors.
- **Security / compliance** stakeholders who care about **reviewable** process definitions, not only logs.
- **Open-source maintainers** building adjacent tooling (linters, importers, codegen) who want a **stable IR contract**.
- Developers skeptical of **“no-code” black boxes** who still want **small, explicit** spec formats.

---

## What to Show First

Order for a new visitor:

1. **README** — Positioning, 5-minute entry, minimal code sample.
2. **[First run](first-run.md)** — Shortest successful path.
3. **[Diagrams](diagrams.md)** — Pipeline and in/out of repo.
4. **[Examples](examples.md)** — Realistic usage without overclaiming.
5. **[Why now?](why-now.md)** — Strategic context, no hype.

---

## Tone Rules

- **Technical** — Name concrete artifacts: `.tq`, `ir_goal`, `validate_ir`, JSON Schema.
- **Honest** — Early core, small default registry, execution not included.
- **No cringe marketing** — Avoid “revolutionary,” “game-changing,” “10x.”
- **No fake traction** — No user counts, stars, or adoption claims unless real.
- **No hype claims** — Do not imply production readiness or ecosystem size you do not have.

---

## Suggested First Communities

Places to share **carefully** (read rules first; disclose affiliation; prefer “Show HN” / “feedback welcome” tone):

- **Hacker News** — Show HN for substantive posts; technical title; engage in comments.
- **Reddit** — Programming, devops, opensource, language- or architecture-focused subs (no spam; follow self-promo rules).
- **Workflow / automation** — Communities around BPM, RPA, or orchestration (position as **spec layer**, not a competitor runtime).
- **AI engineering** — Groups focused on evals, tooling, and reliability (emphasize **contract** and **validation**, not “AI inside Torqa”).
- **Open source builders** — Indie hackers / OSS circles that value small-scope, well-documented cores.

---

*This kit is a guide, not a mandate. Adjust every line to match what the repository actually ships.*
