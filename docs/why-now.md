# Why Now?

## The shift happening now

Automation is no longer only hand-written scripts in one repo. **More workflow intent is produced or assisted by models**—drafts appear quickly, change often, and are easy to pipe toward execution. **That speed is a liability if nothing stands between generator output and a runtime.** At the same time, **real systems chain many tools** (ticketing, identity, cloud APIs, internal services). Each piece may work; the **end-to-end process** is harder to see and to govern.

Teams increasingly need **process definitions they can review, diff, and audit**—not only “what ran,” but **what was supposed to run**. When **AI-generated or imported specs feed execution directly**, without a shared, checkable contract in the middle, problems show up **late**: in production behavior, opaque worker errors, or “we thought the JSON was fine.”

**Syntax checks are not enough for generated workflows.** A file can parse and still lack audit ownership, carry a **severity** your policy forbids in CI, or describe a graph larger than your team wants to rubber-stamp. You need **trust gates**: structural and semantic correctness **plus** explicit **policy**, **risk**, and **profile** evaluation **before** handoff—exactly the layer Torqa implements in-repo, without calling external APIs or running your workflows.

## The missing layer

Runtimes, orchestrators, and builders answer **how** work runs. They are necessary; they are not a substitute for a **stable specification** of intent, and they are a poor place to **discover** that a generated file was never valid—or never met your **trust** bar.

Many organizations already have **several** execution paths. Far fewer have a **thin, trusted layer** that says: this is the workflow in a **canonical form**, these checks **must** pass before we treat it as acceptable input to anything that acts on behalf of users or systems. Torqa targets that **gap**—not another execution engine, but a **verifiable spec** with **policy and risk** you run **before** handoff: **parse/load → canonical IR → structural and semantic validation → trust evaluation** ([Trust layer](trust-layer.md)), whether the bytes came from a person or a generator.

## Why Torqa matters now

- **Trust gate for generated workflows** — Same pipeline for `.tq` or bundle JSON: **no** separate “AI bypass.” Invalid structure, bad semantics, failed **policy**, or stricter **`--profile`** stop the spec **before** an external executor sees it.
- **Canonical contract** — One IR shape (`ir_goal` in a versioned bundle) so humans, generators, and tools aim at the same artifact.
- **Deterministic checks** — Parse, validation, policy, and risk behave the same in CI and on a laptop.
- **Portable definitions** — The spec can move across teams and systems without being locked to one vendor’s JSON dialect.
- **Profile-aware discipline** — **`default`**, **`strict`**, **`review-heavy`** align evaluation strictness with team norms without forking the parser.
- **Safer handoff to execution** — Failures surface in **validation output**, not only in runtime.

None of this removes the need for operational testing; it **front-loads** specification and **trust** risk where it is cheaper to fix, and **reduces the chance that unvalidated generated output is mistaken for a trusted definition**.

## Who benefits first

- **Teams using AI-assisted workflow authoring** who need a **deterministic gate** between draft and execution—not a bundled LLM, but validation and **trust checks** on real `.tq` and JSON already supported here.
- **Internal tools teams** standardizing how automation is described before it ships.
- **Automation engineers** who need diffs and checks, not only opaque job configs.
- **Platform teams** defining how products hand off to execution consistently.
- **Compliance-sensitive environments** where **who approved what definition** matters as much as what ran.

## What success could look like

These are **outcomes Torqa is designed to support**, not guarantees or a product roadmap:

- **Fewer bad specs reaching runtimes** — Especially when content is **generated** or **imported** at volume; failures show up in validation and **trust output**, not only in production.
- **Better internal workflow quality** — Bad specs caught in review and CI.
- **Easier reviews** — Text, IR, and **policy/risk** lines that peers can read and compare.
- **Reusable specs** — Same contract feeding more than one downstream path over time.
- **Cleaner migrations** — Importers target one IR instead of re-inventing validation per source.
- **Stronger tooling ecosystem** — Linters, tests, and docs built against a **small, explicit** core.

## What Torqa is not trying to do

- **Replace every tool** — Executors, schedulers, and UIs remain; Torqa is the spec and **trust** layer in front of them.
- **Become a giant platform** — The repository stays a **minimal core**: parse, IR, validate, trust evaluation.
- **Act as a hype-driven AI wrapper** — There is **no** bundled LLM product or API in this repo; models may **emit** text that becomes `.tq` or IR, but Torqa itself is **tool-agnostic** and **validation-first**. The wedge is **verifying** those artifacts—including **policy and risk**—before execution.

If the strategic story matches your constraints, start with [Quickstart](quickstart.md), [Trust layer](trust-layer.md), [`examples/ai_guardrail.md`](../examples/ai_guardrail.md), and [Examples](examples.md).
