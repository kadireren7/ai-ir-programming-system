# Trust risk scoring

Torqa stacks **four** separable concerns on workflow IR:

| Layer | Question | Mechanism |
|-------|----------|-----------|
| **Structural validation** | Is this IR well-formed? | `validate_ir` |
| **Semantic validation** | Is this spec coherent under the effect registry? | `build_ir_semantic_report` |
| **Policy** | Does it violate **hard trust rules** (required audit metadata)? | `build_policy_report` → `policy_ok`, `errors` |
| **Risk** | Under **fixed heuristics**, how should we **classify** the spec for review prioritization? | Same report → `risk_level`, `reasons` |
| **Profile** | Which **built-in** rule set applies? | `trust_profile` field and CLI **`--profile`** ([Trust profiles](trust-profiles.md)) |

**Risk is not ML**, not probabilistic, and not a prediction of runtime incidents. It is a **deterministic label** plus **explainability strings** so humans and tools know *why* Torqa classified the spec as low, medium, or high risk under the **current** built-in rules.

## Why deterministic scoring matters

When specs come from generators or imports, teams need a **repeatable** signal: the same IR must yield the same risk tier and the same reasons in CI, locally, and in review. That rules out learned scores and black-box models in this layer. Heuristics can grow over time, but each rule must stay **explicit and test-backed**.

## Report fields (`build_policy_report`)

The policy API returns one structure (extend [Trust policies](trust-policies.md)). Pass **`profile=`** to select **`default`**, **`strict`**, or **`review-heavy`** ([Trust profiles](trust-profiles.md)).

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

- **`risk_level`**: `"low"` \| `"medium"` \| `"high"` — ordered tiers; **high** overrides **medium** when multiple signals apply.
- **`reasons`**: Human-readable lines (stable ordering) listing **all** contributing factors, including the positive **“Within current heuristics …”** line when the tier is **low**.

## Current heuristics (shipped)

**`default`** and **`review-heavy`** share the same risk tier table below for the graph size and severity signals; **`strict`** uses a lower transition threshold and treats large graphs as **high** risk (see [Trust profiles](trust-profiles.md)).

Implemented in `src/torqa/policy/report.py`:

| Signal | Effect on risk | Notes |
|--------|----------------|--------|
| Invalid or missing **`surface_meta`** shape | **high** | Policy may also set `policy_ok: false`. |
| Missing **`owner`** or **`severity`** | **high** | Same conditions drive policy errors. |
| **`severity`** value is **`high`** (case-insensitive) | **high** | Sets **`review_required: true`**. |
| **`len(transitions) > 5`** | **medium** if nothing above forces **high** | Also adds a policy **warning**. |
| Owner + severity present, severity not high, ≤ 5 transitions | **low** | Appends an explicit “within heuristics” reason. |

If several conditions apply (e.g. high severity **and** many transitions), **`reasons`** lists **each**; **`risk_level`** remains **high**.

## CLI

**`torqa validate`** and **`torqa doctor`** print **`Trust profile:`**, **`Risk level:`**, and **`Why:`** (same **`reasons`** lines). Use **`--profile default|strict|review-heavy`**. **`torqa inspect`** is unchanged (JSON only on stdout).

## Extensibility

New heuristics should remain **pure functions of IR** (and possibly policy outcomes), with tests fixing strings and tier behavior. Org-specific risk models belong in **your** tooling if they need data Torqa does not own.

See also: [Architecture](architecture.md), [Quickstart](quickstart.md).
