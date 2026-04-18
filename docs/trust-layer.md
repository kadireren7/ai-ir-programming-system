# Trust Layer

Torqa is not only a parser and IR validator. It is a **workflow trust layer**: a deterministic place to decide whether a spec—human-written or machine-generated—is fit to hand off to execution, **before** any runtime runs.

This document summarizes what that means in the **current** repository (v0.x core). It does not invent features that are not implemented.

---

## What Torqa now does

1. **Parse or load** workflow-shaped input (strict **`.tq`** or conforming bundle JSON) into canonical **`ir_goal`**.
2. **Validate structure** (`validate_ir`) — the IR obeys the data model.
3. **Validate semantics** under the default effect registry and logic rules — the story is coherent, not just well-typed.
4. **Apply trust policy** — required audit metadata and profile-specific rules (`build_policy_report`).
5. **Assign deterministic risk** — a tier (`low` / `medium` / `high`) and **reasons** (explainability, not ML).
6. **Expose trust profiles** — **`default`**, **`strict`**, **`review-heavy`** via **`--profile`** so teams can align CLI behavior with how much friction they want before handoff.

Steps 4–6 run **after** structure and semantics succeed. The **`torqa validate`** command is the single entry point for “can we treat this file as a trusted spec artifact?” **Execution remains outside this repo.**

---

## Validation vs semantics vs policy vs risk

| Concern | Question | Mechanism |
|--------|----------|-----------|
| **Structural validation** | Is the IR well-formed? | `validate_ir` |
| **Semantic validation** | Is the workflow coherent under the registry? | `build_ir_semantic_report` |
| **Policy** | Does it violate **hard** trust rules (e.g. missing audit fields, or **`strict`** blocking **`severity: high`**)? | `build_policy_report` → `policy_ok`, `errors` |
| **Risk** | Under fixed heuristics, what **tier** and **reasons** apply for prioritization? | Same report → `risk_level`, `reasons` |

Syntax and shape are necessary but **not sufficient** for trust. Policy encodes **organizational** minimums; risk adds a **transparent** classification layer. Neither replaces integration testing or operational monitoring.

---

## Trust profiles

Profiles change **which conditions fail policy**, **when `review_required` is set**, and **risk thresholds**—not the parser and not the semantic core. See [Trust profiles](trust-profiles.md).

- **`default`** — Baseline rules and risk model ([Trust risk scoring](trust-scoring.md)).
- **`strict`** — Stricter: e.g. **`severity: high`** can **fail** validation; smaller graphs can trigger **medium**/**high** risk earlier.
- **`review-heavy`** — More **`review_required`** signals without necessarily failing on severity alone.

Same spec file, different **`--profile`**, different trust outcome—deterministic and test-backed.

---

## Why this matters for generated workflows

Models and templates can emit plausible **`.tq`** or JSON at volume. A parse-only or syntax-only gate catches **malformed** text; it does not, by itself, enforce **audit fields**, **severity discipline**, or **review signals** aligned to your team.

Torqa’s trust layer answers: *Is this spec structurally and semantically acceptable **and** does it meet our policy and risk bar?* That is a different question than “did it parse?”—and it is the question you want answered **before** an executor, orchestrator, or codegen consumes the artifact.

---

## What Torqa still does not do

- **Run** workflows, call external systems, or embed an LLM.
- **Prove** business correctness—only spec-layer checks you can automate deterministically.
- **Replace** CI integration tests, staging validation, or human approval processes where your org requires them.
- Offer arbitrary user config files for trust rules **yet**—profiles are **built-in** and code-defined ([Trust profiles](trust-profiles.md)).

---

## Where this could grow next

Possible directions (not commitments): pluggable policy packs, richer **`surface_meta`** conventions, export of machine-readable trust reports for downstream systems, or tighter coupling to org-specific identity/approval stores—**outside** this repository unless explicitly added here.

For current behavior and limits, see [Roadmap](roadmap.md), [FAQ](faq.md), and [Trust policies](trust-policies.md).
