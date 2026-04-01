# Self-evolution pipeline (metacircular path)

**Status:** Roadmap draft. Full self-hosting is **not** claimed; this describes how the ecosystem can **grow inside its own rules** over time. Aligns with [`AI_NATIVE_LANGUAGE_CHARTER.md`](AI_NATIVE_LANGUAGE_CHARTER.md), [`FORMAL_CORE.md`](FORMAL_CORE.md), and [`AEM_SPEC.md`](AEM_SPEC.md).

---

## 1. Frozen core, open extension surface

| Layer | Rule |
|-------|------|
| **Frozen** | `FORMAL_CORE` phases, AEM scheduling, canonical `ir_version` families, and **backward rules** for existing `PX_*` codes for a given major IR generation. |
| **Open** | New **registry entries** (predicates/effects), optional `library_refs`, policy plugins, projections, and AI authoring templates — each gated by the pipeline below. |

**Principle:** Nothing “becomes core” by accident. Core changes require a **charter + spec revision** and a version bump; extensions ship as libraries or registry modules with proofs and CI gates.

---

## 2. Adding builtins / libraries: proof + validation + versioning

**Stages (ordered):**

1. **Proposal** — JSON or IR patch describing new symbols: names, signatures, determinism notes, intended phase (`kind_type` / `wellformed` impact).
2. **Static proof artifacts** — machine-checkable: schema-valid bundle, passes `FORMAL_CORE` phases through `policy` for a **golden corpus** extended with representative goals.
3. **Semantic registration** — entry added to the canonical registry **or** linked via `library_refs` with pinned `version` and optional `fingerprint` (see [`CORE_SPEC.md`](CORE_SPEC.md)).
4. **Runtime adapters** — host implements effects for AEM; parity tests vs reference prototype.
5. **Release** — semver on library; IR `ir_version` bumped only if wire shape changes; migration notes in [`docs/IR_VERSIONING.md`](IR_VERSIONING.md) family.

**Rejection without merge:** missing fingerprints when policy requires them; failing determinism (`PX_IR_SEMANTIC_DETERMINISM`); undefined `AEM_*` behavior for new effects.

---

## 3. AI-produced changes: automatic rejection cases

The pipeline **must reject** (no merge, no registry promotion) when:

- Output is not **parseable JSON** matching schema, or top-level shape violates bundle contract.
- Any `PX_*` issue remains after a bounded repair loop (see [`AI_GENERATION_PROFILE.md`](AI_GENERATION_PROFILE.md)).
- **Secret or credential** literals appear in IR or patches (org policy).
- **Nondeterministic** constructs appear in profiles marked deterministic (e.g. wall-clock without named effect).
- **Registry escape:** calls to unknown functions or effects not declared in the allowed merge set for this change.
- **Scope creep:** edits that touch frozen core files or spec without human-approved spec PR.
- **Signature / provenance failure:** required attestations missing (see §4).

---

## 4. Human approval, signature, and policy

| Gate | Purpose |
|------|---------|
| **Human review** | Core spec, AEM changes, new policy classes, and first-time library namespaces. |
| **Cryptographic signature** | Optional signing of `library_refs` fingerprints or release bundles (tooling TBD). |
| **Policy layer** | Org rules: allow-listed models, max bundle size, forbidden domains, PII scanners — emit `POLICY_*` (see `FORMAL_CORE` P3). |

AI may **propose**; only CI + policy + designated reviewers **promote**.

---

## 5. Token-efficient authoring strategy

**Constrained alphabet:** Require ASCII identifiers, fixed `metadata` keys, numeric condition/transition id patterns, and **no prose** outside `goal` / `result` strings.

**Layered prompts:**

1. **Pass A — Skeleton:** Emit minimal bundle: `goal`, `inputs`, empty arrays, `metadata` with exact `ir_version`, placeholder ids.
2. **Pass B — Conditions:** Fill `preconditions` / `forbids` using only registry predicates; re-validate.
3. **Pass C — Transitions:** Add `transitions` with void effects; re-validate handoff + semantics.
4. **Pass D — Postconditions:** Close `postconditions`; final full diagnostic.

Each pass feeds **structured verifier output** (codes + phases) back; model **must not** rewrite unrelated sections on repair (minimal diff discipline — see `AI_GENERATION_PROFILE`).

---

## 6. Milestones toward metacircular tooling

1. Verifier and registry data emitted as **IR-readable tables** (today partially via `TORQA language`).
2. **Patch language** for IR constrained to schema (already trending in mutation APIs) — AI edits patches, not free files.
3. Optimizers / linters expressed as **goals over IR** (same formal core), not ad-hoc Python.
4. Long-term: single implementation language **bootstrapped** from IR + AEM spec; until then, Python/Rust remain reference hosts.
