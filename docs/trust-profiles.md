# Trust profiles

Teams differ on how much signal they want before a workflow spec is treated as **handoff-ready**. **Trust profiles** select one of several **built-in**, **deterministic** evaluation modes for the same IR—no config files, no network, same parser and semantic core.

The CLI passes **`--profile NAME`** to **`torqa validate`** and **`torqa doctor`** (default: **`default`**). Output includes **`Trust profile: <name>`** before policy lines. **`torqa inspect`** is unchanged.

Programmatic use: **`build_policy_report(ir_goal, profile="default")`**; the report includes **`trust_profile`** with the canonical id.

## Built-in profiles

### `default`

Baseline behavior: required **`surface_meta.owner`** and **`.severity`**, **`review_required`** when severity value is **`high`**, transition warning when **`len(transitions) > 5`**, and the same risk tier rules as [Trust risk scoring](trust-scoring.md) for the default path.

### `strict`

Stricter **policy** and **risk** thresholds:

| Signal | Effect |
|--------|--------|
| Missing owner / severity | Policy error (same as default). |
| **`severity`** value **`high`** | **Policy error** (spec fails validation) and **`review_required`**. |
| **`len(transitions) > 5`** | Policy **warning** and **`review_required`**. |
| **`len(transitions) > 3`** | Contributes to **risk** (medium if nothing else forces **high**; **high** if combined with other strict signals). |
| **`len(transitions) > 5`** | Risk treated as **high** in strict (large graphs flagged aggressively). |

Use when you want CI to **reject** high-severity labels unless you adopt a different workflow, and to surface smaller graphs (four–five transitions) as **medium** risk earlier than `default`.

### `review-heavy`

Same **policy errors** as **`default`** (severity **`high`** does **not** fail policy). **`review_required`** is set when severity is **`high`** **or** when **`len(transitions) > 3`**. Risk tiers match **`default`**.

Use when automation should **flag more specs for human review** without failing the gate on severity alone.

## When to use which

| Situation | Suggested profile |
|-----------|---------------------|
| General CI / mixed teams | **`default`** |
| Regulated or high-assurance pipelines where **`high`** must not land without a separate process | **`strict`** |
| Review-first culture: many generated specs, humans triage by **`review_required`** | **`review-heavy`** |

## Limits

- Profiles are **code-defined** in `src/policy/report.py` and `src/policy/profiles.py`; there is no user-facing config file yet.
- Behavior stays **deterministic** and **test-backed**; extend by adding a new branch and tests, not by runtime flags beyond **`--profile`**.

See also: [Trust policies](trust-policies.md), [Trust risk scoring](trust-scoring.md), [Quickstart](quickstart.md).
