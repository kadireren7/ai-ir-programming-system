# Abstract Execution Machine (AEM) — specification skeleton

**Status:** Normative skeleton aligned with [`FORMAL_CORE.md`](FORMAL_CORE.md). Python (`src/execution/ir_execution.py`) and Rust executors are **reference prototypes**, not definitional.

---

## 1. Scope

The AEM defines **how** a valid IRGoal is executed abstractly: stores, evaluation rules, transition steps, and where host behavior is allowed. It does **not** define projection emitters (SQL, webapp, etc.).

---

## 2. Stores

| Store | Symbol | Mutable during run? | Content |
|-------|--------|---------------------|---------|
| Input bindings | `μ` | No (fixed for a run) | Declared workflow inputs. |
| Control location | `σ` | Yes | `before` \| `after` (two-state abstract control). |
| Host facet | `π` | Yes **only** via registered void effects | Opaque key–value; domain state, handles, audit tails, etc. |

**Bindings resolution order for `identifier`:** `μ` then `π` (read). Writes go only through effects.

---

## 3. Registry snapshot

At execution start, the engine fixes a **registry** `R`: map from symbol → signature (argument types, return kind: boolean \| text \| number \| void, optional effect contract). All `call` names and transition `effect_name` values must resolve in `R` (already enforced in `kind_type` phase).

---

## 4. Expression evaluation

**Input:** expression `e`, configuration `C = (μ, σ, π)`, registry `R`.  
**Output:** value `v` or `AEM_*` failure.

Inductive definition matches `FORMAL_CORE` §3.2. Implementations must not add hidden implicit coercions beyond the registry.

**Determinism assumption:** `⟦e⟧` depends only on `e`, `μ`, `π`, and `R`; no wall-clock or randomness unless introduced by an explicit effect that returns a value stored in `π`.

---

## 5. Execution trace

1. **Initialize:** `σ ← before`, load `μ` from caller, `π` from host (default empty map).
2. **Pre block:** For each precondition in list order, evaluate `expr` at `σ`; on false → `AEM_PRECOND_FALSE` + halt.
3. **Forbid block:** For each forbid in list order, evaluate at `σ`; on true → `AEM_FORBID_TRUE` + halt.
4. **Transition block:** For each transition in list order:
   - If `σ ≠ from_state` → `AEM_STATE_MISMATCH` (non-conforming schedule) **or** skip per explicit spec revision — **default: mismatch is error**.
   - Evaluate arguments; invoke `effect_name` → on host refusal → `AEM_EFFECT_REJECT`; on throw → `AEM_EFFECT_EXN`.
   - `σ ← to_state`.
5. **Finish:** Evaluate postconditions at `σ` (expected `after`); on false → `AEM_POSTCOND_FALSE`.
6. **Result:** Surface `result` field as projection-friendly label; does not override boolean success of postconditions.

---

## 6. Side-effect boundary

- **Inside AEM:** Condition evaluation reads `μ`/`π`; transitions invoke **only** registry void effects with evaluated argument values.
- **Outside AEM (host):** Real IO, network, clocks, randomness, third-party APIs. Any such observation must be **bridged** by an effect that is named in `R` and documented; silent side channels break determinism postulate.
- **Forbidden:** Implicit global mutable state not reachable via `π` updates from named effects.

---

## 7. Comparison with current IR `transitions` / `effect_name` model

### 7.1 Preserved (stay compatible)

- Transition records: `transition_id`, `effect_name`, `arguments`, `from_state`, `to_state` with enum `before` | `after`.
- Preconditions / forbids / postconditions as separate lists with `kind` + `expr`.
- Void builtins as transition effects; predicates in conditions (registry split).

### 7.2 Conscious differences / evolution targets

| Topic | Current IR / prototype | AEM / target |
|-------|------------------------|--------------|
| Control states | Exactly two labels `before`/`after` | Same for v1 AEM; **future:** named states graph if spec extends `IRGoal`. |
| `effect_name` vs `call` | Effect mirrored as string name parallel to `call` in expr | **Unify** in long term: effect invocation as typed `call` with void kind (serialization TBD). |
| Schedule | Python builds linear plan: pre → forbid → trans → finish | AEM **normative** schedule matches; Rust must not reorder without spec change. |
| `from_state` / `to_state` | Reference Python (`execute_ir_goal`) and Rust (`execute`) **enforce** `σ` and `from_state`/`to_state`; postconditions require `σ = after` when any postcondition exists. | Same as AEM §5; keep parity tests aligned. |
| `σ` vs domain | Easy to conflate `after` with business “completed” | AEM keeps `σ` **purely control**; business completion lives in `π` via effects. |
| Failure codes | Mostly string messages in Python result | Map to `AEM_*` codes from `FORMAL_CORE` for cross-host parity. |
| `world_state` | Python `IRExecutionContext.world_state` | Formal `π`; host supplies initial `π` and effect implementations. |

---

## 8. Reference prototypes (non-authoritative)

- **Python:** `IRExecutionContext`, `build_ir_execution_plan`, `execute_ir_goal` in `src/execution/ir_execution.py` — debugging and parity.
- **Rust:** engine paths under `rust-core/` — performance path; must converge to this AEM as tests tighten.

Conformance tests should compare Python vs Rust vs future hosts on golden bundles: same trace of transition IDs and same success bit for fixed `μ` and stub `π`.

---

## 9. Open items (to close in later revisions)

- Formal semantics for `unknown` input type and gradual typing at AEM boundary.
- Standard encoding of `library_refs` into `R` (link-time merge rules).
- Optional transactional `π` (rollback on `AEM_EFFECT_REJECT`).
