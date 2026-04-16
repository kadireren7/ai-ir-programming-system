# Why Now?

## The shift happening now

Automation is no longer only hand-written scripts in one repo. **More workflow intent is produced or assisted by models**—drafts appear quickly and change often. At the same time, **real systems chain many tools** (ticketing, identity, cloud APIs, internal services). Each piece may work; the **end-to-end process** is harder to see and to govern.

Teams increasingly need **process definitions they can review, diff, and audit**—not only “what ran,” but **what was supposed to run**. When generated or imported specs **feed execution directly**, without a shared, checkable contract in the middle, errors show up **late**, in production behavior, instead of in validation.

## The missing layer

Runtimes, orchestrators, and builders answer **how** work runs. They are necessary; they are not a substitute for a **stable specification** of intent.

Many organizations already have **several** of those. Far fewer have a **thin, trusted layer** that says: this is the workflow in a **canonical form**, these checks **must** pass before we treat it as acceptable input to anything that executes. Torqa targets that **gap**—not another execution engine, but a **verifiable spec** in the middle.

## Why Torqa matters now

- **Canonical contract** — One IR shape (`ir_goal` in a versioned bundle) so humans, generators, and tools aim at the same artifact.
- **Deterministic validation** — Parse and check rules behave the same in CI and on a laptop; fewer “works on my machine” specs.
- **Portable definitions** — The spec can move across teams and systems without being locked to one vendor’s JSON dialect.
- **CI-friendly workflows** — Specs in git with automated `validate_ir` and semantic reports fit review and release discipline.
- **Safer handoff to execution** — Invalid structure and incoherent semantics surface **before** a runtime is asked to act on them.

None of this removes the need for operational testing; it **front-loads** spec risk where it is cheaper to fix.

## Who benefits first

- **Internal tools teams** standardizing how automation is described before it ships.
- **Automation engineers** who need diffs and checks, not only opaque job configs.
- **Teams building AI-assisted workflow authoring** and needing a **target format** that validates.
- **Platform teams** defining how products hand off to execution consistently.
- **Compliance-sensitive environments** where **who approved what definition** matters as much as what ran.

## What success could look like

These are **outcomes Torqa is designed to support**, not guarantees or a product roadmap:

- **Better internal workflow quality** — Bad specs caught in review and CI.
- **Easier reviews** — Text and IR that peers can read and compare.
- **Reusable specs** — Same contract feeding more than one downstream path over time.
- **Cleaner migrations** — Importers target one IR instead of re-inventing validation per source.
- **Stronger tooling ecosystem** — Linters, tests, and docs built against a **small, explicit** core.

## What Torqa is not trying to do

- **Replace every tool** — Executors, schedulers, and UIs remain; Torqa is the spec layer in front of them.
- **Become a giant platform** — The repository stays a **minimal core**: parse, IR, validate.
- **Act as a hype-driven AI wrapper** — There is **no** bundled LLM product; models may **emit** text that becomes `.tq` or IR, but Torqa itself is **tool-agnostic** and **validation-first**.

If the strategic story matches your constraints, start with [Quickstart](quickstart.md) and [Examples](examples.md).
