# Production readiness report

This document answers two questions for **this repository as shipped today**:

1. **Is TORQA ready for real trials?**
2. **What is missing?**

It is a **consolidated judgment** drawn from [TRIAL_READINESS.md](TRIAL_READINESS.md), [SUPPORTED_SCOPE.md](SUPPORTED_SCOPE.md), [STATUS.md](../STATUS.md), [WEBUI_SECURITY.md](WEBUI_SECURITY.md), and [FAILURE_MODES.md](FAILURE_MODES.md). It does not replace those sources; use them for procedures and contracts.

---

## Definitions (read first)

| Term | Meaning here |
|------|----------------|
| **Real trial** | A serious, time-boxed evaluation on your machine or in your lab: install from source, run the **canonical flagship path**, build generated artifacts, optionally use `torqa-console` / desktop, read benchmark and gate outputs. |
| **Production deployment** | Internet-facing or multi-tenant **product** operation: hardened auth, SLAs, managed hosting, compliance, arbitrary customer workloads without hand-holding. |

The answers below treat these **separately**. TORQA can be **trial-ready** without being **production-deployable** as a hosted service.

---

## Is TORQA ready for real trials?

**Yes — for the scoped trial described in [TRIAL_READINESS.md](TRIAL_READINESS.md) and [examples/trial_ready/README.md](../examples/trial_ready/README.md).**

You can reasonably run a **real trial** if your goal is to validate:

- **Semantic-first authoring** (`.tq` / IR JSON) with **envelope, structural, and semantic checks** and a **hard gate** before materialize ([VALIDATION_GATE.md](VALIDATION_GATE.md)).
- A **repeatable flagship demo**: `torqa demo` → `torqa demo verify` → `torqa build examples/benchmark_flagship/app.tq` → local Vite preview ([DEMO_LOCALHOST.md](DEMO_LOCALHOST.md)).
- **Measured compression** (deterministic token estimator) and **checked-in baseline** plus CLI/UI surfaces (`torqa demo benchmark`, `torqa-console` product page) ([BENCHMARK_COMPRESSION.md](BENCHMARK_COMPRESSION.md)).
- **Multi-surface projection** (web preview shell, SQL-shaped output, language stubs) for **flow-shaped** intent, not arbitrary sites ([USE_CASES.md](USE_CASES.md)).

**Qualifiers (not blockers for a trial, but honest scope):**

- The **generated web UI** is a **credible preview**, not a design system or auth backend ([TRIAL_READINESS.md](TRIAL_READINESS.md)).
- **Projection strength** is highest for **login/session-shaped** and similar **workflow** demos; marketing sites and large arbitrary SPAs are **out of scope** for this milestone.
- **Local tooling** assumes a **developer environment** (Python 3.10+, optional Node for generated webapp, optional Rust — not required thanks to Python fallback per [STATUS.md](../STATUS.md)).
- **Web console** is a **local prototype**; read [WEBUI_SECURITY.md](WEBUI_SECURITY.md) before exposing it to **untrusted networks**.

**Verdict for “production” as hosted product:** **No.** This repo does **not** ship a hardened SaaS, enterprise IAM, or turnkey internet-facing deployment. That remains **missing** by design until separate product and security work land (see below).

---

## What is missing?

Grouped by theme. Items are **gaps relative to a shrink-wrapped or internet-scale product**, not necessarily blockers for a **local flagship trial**.

### Product and UX

- **General-purpose “any website from prose” generation** — explicitly out of scope; value today is **checkable intent + gate + compression story** on bounded shapes ([TRIAL_READINESS.md](TRIAL_READINESS.md)).
- **Production-grade generated UI/UX parity** with hand-built apps; roadmap item: **harden website projection + quality gates** ([STATUS.md](../STATUS.md)).
- **Full editor experience** (rich undo/session model) — partial today ([STATUS.md](../STATUS.md)).
- **Deep multi-domain projection families** beyond current web / SQL / stub emphasis — partial ([STATUS.md](../STATUS.md)).

### Security and operations

- **Enterprise / multi-tenant security model** for a hosted offering — not provided ([SUPPORTED_SCOPE.md](SUPPORTED_SCOPE.md)).
- **Authenticated server-side materialize to arbitrary paths** — intentionally **not implemented**; would need auth and strict allow-lists ([WEBUI_SECURITY.md](WEBUI_SECURITY.md)).
- **Rate limiting / abuse controls** beyond current notes for zip endpoints — see [WEBUI_SECURITY.md](WEBUI_SECURITY.md) for severity framing.
- **Operational runbooks, on-call, SLAs** — outside repo scope.

### Language, IR, and tooling maturity

- **`.tq` surface vs JSON IR** — real and improving; some areas remain **partial** (parser pipeline polish, trace richness) ([STATUS.md](../STATUS.md)).
- **Rust everywhere** — optional; not guaranteed on every machine ([STATUS.md](../STATUS.md)).
- **Self-evolution / aggressive legacy removal** — labeled **experimental**; not a stability promise for trials that depend on those modules ([STATUS.md](../STATUS.md)).
- **Transitional `.pxir`** — supported as legacy subset, not the primary narrative ([SURFACE_CLASSIFICATION.md](SURFACE_CLASSIFICATION.md)).

### Packaging and distribution

- **PyPI (or equivalent) installable artifact** with pinned, audited release process — README/Quick Start assume **editable install from source** today; see [RELEASE_AND_VERSIONING.md](RELEASE_AND_VERSIONING.md) for versioning direction.
- **Single-click installer / managed desktop bundle** — not the current delivery model; official **`torqa-desktop`** expects Node + `npm install` in [`desktop/`](../desktop/) once.

### Evidence and maintenance

- Trials should still run **`torqa demo verify`** in CI or before demos to catch **baseline drift** and gate regressions ([FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md)).
- When something fails, use [FAILURE_MODES.md](FAILURE_MODES.md) to distinguish **contract** (e.g. wrong input type for `validate`) from environment issues.

---

## Preconditions for a successful real trial

1. Clone repo, **`pip install -e .`**, Python 3.10+ ([QUICKSTART.md](QUICKSTART.md)).
2. Follow **`torqa demo`** output; run **`torqa demo verify`** once.
3. Accept **trial scope** in [TRIAL_READINESS.md](TRIAL_READINESS.md) (preview UI, flow-shaped strength).
4. Keep **`torqa-console`** on **localhost** or trusted networks unless you add your own hardening ([WEBUI_SECURITY.md](WEBUI_SECURITY.md)).

---

## Related documents

| Document | Role |
|----------|------|
| [TRIAL_READINESS.md](TRIAL_READINESS.md) | First-trial contract: ready vs limited |
| [SUPPORTED_SCOPE.md](SUPPORTED_SCOPE.md) | What is supported in-repo |
| [STATUS.md](../STATUS.md) | Real / partial / experimental snapshot |
| [FAILURE_MODES.md](FAILURE_MODES.md) | Expected failures and fixes |
| [WEBUI_SECURITY.md](WEBUI_SECURITY.md) | Local server security notes |
| [P72_WEBSITE_OFFICIAL.md](P72_WEBSITE_OFFICIAL.md) | Official product website vs host vs console/desktop |
| [DOC_MAP.md](DOC_MAP.md) | Full doc index |
