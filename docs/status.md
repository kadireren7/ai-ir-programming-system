# Repository status and pre-v1 readiness

**Last reviewed:** 2026-04 (living document; update when scope or quality bar changes.)

This page is an **honest audit** of the Torqa core as shipped in-repo: what is solid, what is rough, and what typically remains before calling a **1.0** API/contract freeze. It is not a marketing claim—use it for internal planning and contributor alignment.

---

## Summary verdict

| Area | Assessment |
|------|------------|
| **Product clarity** | **Strong.** v0.1.5 keeps product signal focused on n8n/automation workflow governance (not enterprise platform breadth). |
| **Technical quality** | **Solid for v0.x.** Test-backed pipeline (`validate_ir` → semantics → policy), deterministic outputs, versioned IR. Coverage is smoke-heavy, not an exhaustive matrix. |
| **UX (author / reviewer)** | **Mixed.** `.tq` errors use stable `PX_TQ_*` codes; JSON load errors include path hints. Batch JSON and `torqa.toml` improve CI ergonomics; `doctor` / `explain` reject JSON arrays—documented, but can surprise newcomers. |
| **CLI quality** | **Good and improving.** v0.1.5 adds one-command onboarding via `torqa quickstart` plus clearer report sharing artifacts (`html`/`md`/`json`). |
| **Trust model** | **Coherent.** Policy + risk + profiles are deterministic and documented ([Trust layer](trust-layer.md), [Trust policies](trust-policies.md)). Not a security audit tool—**trust** here means spec-level gates, not threat modeling. |
| **Docs** | **Improving.** Quickstart, trust docs, CI reports, project config, and demos exist; v0.1.5 sharpens first-run messaging, CI adoption snippets, and public API/report contract language. |
| **Adoption readiness** | **Early-adopter.** Install is `pip install -e ".[dev]"`; no PyPI story in-repo. [CONTRIBUTING](../CONTRIBUTING.md) and [GOOD_FIRST_ISSUES](../GOOD_FIRST_ISSUES.md) lower the bar for contributors. |

---

## Gaps before a hypothetical v1

These are **typical** prerequisites for a **stable 1.0** (semver contract, support expectations)—not a commitment to ship v1 on a date.

1. **Distribution** — Published packages on PyPI (or equivalent), version pinning story, and install docs that do not assume a git clone.
2. **API / IR stability** — Explicit stability policy for `ir_goal` wire shape, `CANONICAL_IR_VERSION`, and when migrations are required; schema and code stay in lockstep.
3. **CI as a reference** — Optional in-repo workflow (or documented external CI) running `pytest` on supported Python versions so adopters can copy patterns.
4. **Operational guarantees** — Clarified support level (community vs maintained), security reporting path, and compatibility matrix if the project grows.
5. **Hardening where it hurts** — Broader tests around edge bundles, large inputs, and failure modes without weakening validation (see [Roadmap](roadmap.md) near-term items).

**Explicitly not required for “v1” of the *idea***: a workflow runtime, hosted product, or bundled AI—those remain out of scope for this repository.

---

## Final status (this snapshot)

- **Shippable today:** Reference Python core, CLI, JSON + `.tq` paths, trust evaluation, schema, contributor docs.
- **Best for:** Teams who want a **checkable spec artifact** and are willing to read honest limits ([RELEASE_NOTES_v0](reports/RELEASE_NOTES_v0.md), [FAQ](faq.md)).
- **Not yet:** Consumer-grade packaging, enterprise support matrix, or a frozen semver story beyond current `0.1.x` early release.

For version-to-version code changes, see **[CHANGELOG](../CHANGELOG.md)**.
