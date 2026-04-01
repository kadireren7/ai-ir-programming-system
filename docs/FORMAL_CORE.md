# Formal core (normative semantics & validation)

This document is the **host-independent constitution** for the AI-native core: operational meaning, failure modes, and **validation phases**. It is not tied to Python or Rust; those implementations must converge here. For charter intent see [`AI_NATIVE_LANGUAGE_CHARTER.md`](AI_NATIVE_LANGUAGE_CHARTER.md). For wire-format fields see [`CORE_SPEC.md`](CORE_SPEC.md) and [`spec/IR_BUNDLE.schema.json`](../spec/IR_BUNDLE.schema.json). Stable diagnostic codes live in [`src/diagnostics/codes.py`](../src/diagnostics/codes.py); phases align with [`src/diagnostics/report.py`](../src/diagnostics/report.py) where noted.

---

## 1. Abstract syntax (values)

An **IRGoal** is a tuple of sections: `goal`, `inputs`, `preconditions`, `forbids`, `transitions`, `postconditions`, optional `result`, and `metadata`. A **bundle** may wrap `ir_goal` and optional `library_refs`.

An **expression** is a finite tree tagged with one of: `identifier`, literal variants, `call`, `binary`, `logical`.

A **condition** is `(condition_id, kind, expr)` with `kind ∈ {require, forbid, postcondition}`.

A **transition** is `(transition_id, effect_name, arguments[], from_state, to_state)` with control states `from_state, to_state ∈ {before, after}` (see §4).

---

## 2. Validation phases (order is normative)

Implementations **must** run phases in order and **must** attach each finding to exactly one phase below. Multiple findings are allowed per phase. Earlier phases do not require later phases to succeed.

| Phase ID | Name | Intent |
|----------|------|--------|
| `syntax` | Syntax | Parsed value exists and satisfies the machine-readable schema for the bundle and `ir_goal`. |
| `kind_type` | Kind & type | Structural roles, identifier conventions, and static typing against the **effect/predicate registry** (arity, operand types, void vs boolean roles). |
| `wellformed` | Well-formedness | Cross-field consistency: global uniqueness, determinism constraints, semantic guarantees (e.g. forbid/read rules). |
| `policy` | Policy | Transport and pipeline policy: envelope, handoff charset/operators, optional fingerprints, org-specific gates **not** encoded in schema alone. |

**Report mapping (reference implementation):** Each diagnostic issue includes **`formal_phase`** (`syntax` \| `kind_type` \| `wellformed` \| `policy`) derived from `PX_*` codes via `src/diagnostics/formal_phases.py`, plus the legacy `phase` bucket (`envelope` → policy; `structural` → split per rule below; `handoff` → policy; `determinism` → wellformed; `semantic` → kind_type where overlap).

---

## 3. Operational semantics (constitutional)

### 3.1 Configurations

A **configuration** `C = (μ, σ, π)` where:

- `μ` — **input bindings**: total map from declared `inputs[].name` to runtime values (typed per input declaration).
- `σ` — **control state** ∈ `{before, after}` (abstract machine location, not domain state).
- `π` — **host projection / world facet** (opaque map keyed by identifiers **not** in `μ`; read/write rules below). Implementations may realize `π` as host memory, DB handles, etc., but **observable transitions** are defined only through declared effects.

### 3.2 Expression evaluation

`⟦e⟧(C)` is defined inductively on the expression tree:

- Literals evaluate to their values.
- `identifier` resolves in `μ` first; if absent, in `π` (host-dependent **read**; see failure rules).
- `call`, `binary`, `logical` combine sub-expressions per the **registry** (names, arities, return kinds). Undefined name or arity → **static** failure (`kind_type`); dynamic type mismatch → **dynamic** failure (`AEM_EVAL_TYPE`).

### 3.3 Condition truth

- **require:** must hold with `σ = before` before any transition sequence is committed.
- **forbid:** must be false with `σ = before` at the same checkpoint (see wellformed rules for when forbids may mention identifiers only guaranteed in `after`).
- **postcondition:** must hold with `σ = after` after all transitions complete.

### 3.4 Transition application

A transition `t` is **enabled** in `C` iff `σ` equals `t.from_state`. Applying `t`:

1. Evaluate `t.arguments` under `C` (same rules as conditions).
2. Resolve `effect_name` to a **void** registry entry; invoke host **effect** with evaluated arguments and read-only access to `μ` and limited `π` per registry contract.
3. Set `σ ← t.to_state`.
4. Host may update `π` only through the effect’s declared semantics (no silent side channels).

**Ordering:** The **abstract schedule** is the list order: all preconditions (as checks), all forbids (as checks), all transitions (as steps), then finish checks for postconditions. This matches the reference plan in the prototype; alternate schedules are **non-conforming** unless this spec is revised.

### 3.5 Failure modes (runtime)

Runtime failures are **orthogonal** to static `PX_*` codes; they use **AEM_*** codes below for spec-level interchange (implementations may embed them in `errors[]` or map to HTTP/CLI).

| Code | When |
|------|------|
| `AEM_PRECOND_FALSE` | A `require` evaluates to false at `before`. |
| `AEM_FORBID_TRUE` | A `forbid` evaluates to true at `before`. |
| `AEM_POSTCOND_FALSE` | A `postcondition` evaluates to false at `after`. |
| `AEM_EFFECT_REJECT` | Host effect refuses (validation, IO, policy). |
| `AEM_EFFECT_EXN` | Host effect raised an untyped exception (implementation-specific string allowed). |
| `AEM_EVAL_UNDEF` | Identifier not in `μ` ∪ readable `π`. |
| `AEM_EVAL_TYPE` | Dynamic type violation during eval. |
| `AEM_STATE_MISMATCH` | Transition applied when `σ` ≠ `from_state`. |

---

## 4. Rules × phase × diagnostic code

Rules are numbered for citation. **Code** is the stable id from `codes.py` when applicable; **—** means use message classification or future code.

### 4.1 Syntax phase

| ID | Rule | Code | Phase |
|----|------|------|-------|
| S1 | Input is valid JSON (or canonical binary, if defined). | `PX_PARSE_FAILED` | syntax |
| S2 | Top-level object matches `IR_BUNDLE.schema.json` (required keys, `additionalProperties` false where schema says so). | `PX_SCHEMA_INVALID` | syntax |
| S3 | Every `expr` node matches the schema’s `oneOf` for `expr`. | `PX_SCHEMA_INVALID` / `PX_IR_EXPR` | syntax |

### 4.2 Kind & type phase

| ID | Rule | Code | Phase |
|----|------|------|-------|
| KT1 | `goal` is non-empty string satisfying declared identifier profile for goals. | `PX_IR_GOAL_EMPTY` | kind_type |
| KT2 | Input names unique; each `type` ∈ allowed input type set. | `PX_IR_INPUT_DUPLICATE`, `PX_IR_INPUT_TYPE` | kind_type |
| KT3 | Preconditions have `kind == require` and ids match `c_req_NNNN`. | `PX_IR_PRECONDITION_KIND`, `PX_IR_PRECONDITION_ID` | kind_type |
| KT4 | Forbids have `kind == forbid` and ids match `c_forbid_NNNN`. | `PX_IR_FORBID_KIND`, `PX_IR_FORBID_ID` | kind_type |
| KT5 | Postconditions have `kind == postcondition` and ids match `c_post_NNNN`. | `PX_IR_POSTCONDITION_KIND`, `PX_IR_POSTCONDITION_ID` | kind_type |
| KT6 | Transitions: `transition_id` matches `t_NNNN`, unique; `from_state`/`to_state` ∈ `{before, after}`. | `PX_IR_TRANSITION_ID`, `PX_IR_TRANSITION_DUPLICATE`, `PX_IR_TRANSITION_STATE` | kind_type |
| KT7 | `metadata` contains required keys including `ir_version` matching the toolchain’s expected canonical version. | `PX_IR_METADATA` | kind_type |
| KT8 | Every `call` and every transition’s `effect_name` appears in the **registry**; arities match. | `PX_SEM_UNKNOWN_FUNCTION`, `PX_SEM_ARITY`, `PX_SEM_UNKNOWN_EFFECT` | kind_type |
| KT9 | Predicate positions (conditions) use boolean-typed expressions per registry; void effects only as transition `effect_name`. | `PX_SEM_TYPE`, `PX_SEM_LOGICAL_OPERAND`, `PX_SEM_COMPARISON` | kind_type |
| KT10 | Every identifier in expressions is defined (input or registry allowance). | `PX_SEM_UNDEFINED_IDENT` | kind_type |

### 4.3 Well-formedness phase

| ID | Rule | Code | Phase |
|----|------|------|-------|
| W1 | All `condition_id` values globally unique across preconditions, forbids, postconditions. | `PX_IR_CONDITION_ID_COLLISION` | wellformed |
| W2 | Semantic determinism constraints (e.g. disallowed non-deterministic constructs in core profile). | `PX_IR_SEMANTIC_DETERMINISM` | wellformed |
| W3 | Forbid conditions do not rely on identifiers without a declared before-state guarantee. | `PX_SEM_FORBID_GUARANTEE` | wellformed |
| W4 | Transitions do not read identifiers in arguments without before-state guarantee where required. | `PX_SEM_TRANSITION_READ` | wellformed |

### 4.4 Policy phase

| ID | Rule | Code | Phase |
|----|------|------|-------|
| P1 | Handoff profile: ASCII identifiers, allowed operators, numeric literals as required by pipeline. | `PX_HANDOFF` | policy |
| P2 | Envelope: if `library_refs` present, each entry satisfies name/version shape; fingerprints optional but if present match toolchain rules. | `PX_SCHEMA_INVALID` (envelope) | policy |
| P3 | Organizational policy (allow-lists, signing, SBOM) — **extension point**; failures use org-defined codes prefixed e.g. `POLICY_` (not in `codes.py` v1). | (org) | policy |

---

## 5. Determinism postulate

**Core postulate:** For fixed registry snapshot, fixed `μ`, and a fixed host effect algebra that implements only registry-declared effects, the sequence `(success, executed_transition_ids, final σ, postcondition outcomes)` is a **pure function** of `IRGoal` and `μ`, assuming the host does not inject hidden entropy into `π` outside effect contracts.

Hosts that perform timing, random IDs, or external IO must encode those as named effects with explicit outputs recorded in `π` if observability is required.

---

## 6. Conformance

An implementation **conforms** to this formal core if:

1. It implements the phase ordering and attaches findings to the correct phase.
2. Static checks emit the listed `PX_*` codes (or a documented bijection).
3. Its abstract execution agrees with §3 on all goals that pass phases through `policy` (excluding org `P3`).
