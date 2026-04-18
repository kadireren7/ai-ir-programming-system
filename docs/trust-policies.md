# Trust policies

Torqa separates structural, semantic, and trust layers on workflow IR:

| Layer | Question | Mechanism |
|-------|----------|-----------|
| **Structural validation** | Is this IR well-formed? | `validate_ir` — shape, consistency, metadata keys expected by the IR model. |
| **Semantic validation** | Is this spec coherent under a declared effect registry? | `build_ir_semantic_report` — known effects, logic rules, `semantic_ok` / `logic_ok`. |
| **Policy + risk** | Does it satisfy **trust rules**, and what **risk tier** do fixed heuristics assign? | `build_policy_report(ir_goal, profile=…)` — `policy_ok`, `errors`, **`risk_level`**, **`reasons`**, **`trust_profile`** (see [Trust risk scoring](trust-scoring.md), [Trust profiles](trust-profiles.md)). |

Structural and semantic checks are about **validity** of the data model and workflow story. **Policy** is about **hard** organizational rules (e.g. required audit fields). **Risk** is a separate, explainable **classification** for prioritization—not a second policy engine.

Policies are **not** a runtime, do not call the network, and do not execute workflows. They read the same **`IRGoal`** object that already passed structural validation when the CLI runs them (after `validate_ir` and semantics succeed).

## Built-in policy rules (current)

Evaluated in `src/policy/report.py` (profile **`default`**; **`strict`** / **`review-heavy`** adjust rules — see [Trust profiles](trust-profiles.md)):

1. **`metadata.surface_meta.owner`** — must be present and a non-empty string. Missing ⇒ policy error.
2. **`metadata.surface_meta.severity`** — must be present and a non-empty string. Missing ⇒ policy error.
3. **High severity** — if `severity` (trimmed, compared case-insensitively) is `high`, the report sets **`review_required: true`** (policy still passes if owner/severity are valid).
4. **Transition count** — if `len(transitions) > 5`, a **warning** is recorded (policy can still pass).

## Policy report shape

```json
{
  "policy_ok": true,
  "review_required": false,
  "risk_level": "low",
  "reasons": [],
  "errors": [],
  "warnings": [],
  "trust_profile": "default"
}
```

- **`policy_ok: false`** — blocking policy errors; CLI **`torqa validate`** exits non-zero after semantic success.
- **`review_required`** — informational flag for humans and tooling (e.g. high severity).
- **`risk_level`** / **`reasons`** — deterministic risk tier and explainability lines ([Trust risk scoring](trust-scoring.md)).
- **Warnings** — do not set `policy_ok` to false.

## CLI

- **`torqa validate`** — After structural and semantic success, prints **`Trust profile:`**, **`Policy validation: PASS/FAIL`**, **`Review required: yes/no`**, policy errors/warnings, **`Risk level:`**, and **`Why:`** (reason lines). Optional **`--profile default|strict|review-heavy`**. Exit **0** only if `policy_ok` is true as well.
- **`torqa doctor`** — Same, with **`Trust profile:`** under **Policy**; supports **`--profile`**.
- **`torqa inspect`** — Unchanged (stdout remains canonical **`ir_goal` JSON** only).

## Honest limits

- Rules are **small and shipped** in this repo; stricter org-specific policies belong in your own tooling or future extensibility.
- Policy does **not** replace integration or end-to-end tests against real executors.
- **`.tq`** without a **`meta:`** block does not populate `surface_meta`; the default policies will **fail** until you add owner/severity (or adjust policy in code for your fork).

See also: [Trust risk scoring](trust-scoring.md), [Concepts](concepts.md), [Architecture](architecture.md), [Quickstart](quickstart.md).
