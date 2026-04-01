# AI generation profile (low token, low error)

Concrete contract for LLM outputs targeting this repository. Complements [`CORE_SPEC.md`](CORE_SPEC.md), [`FORMAL_CORE.md`](FORMAL_CORE.md), and `build_ai_authoring_system_prompt()` in [`src/language/authoring_prompt.py`](../src/language/authoring_prompt.py).

---

## 1. Output surface

- **Exactly one** JSON object per turn (no markdown fences, no trailing commentary).
- Top-level shape: `{"ir_goal": { ... }}` unless tooling explicitly requests full envelope; optional `library_refs` only when integrating shared IR (see §5).

---

## 2. Fixed vocabulary

| Area | Rule |
|------|------|
| Identifiers | ASCII `[A-Za-z_][A-Za-z0-9_]*`; `goal` PascalCase; JSON keys snake_case lowercase. |
| Condition ids | `c_req_NNNN`, `c_forbid_NNNN`, `c_post_NNNN` (four digits); **globally unique** in one goal. |
| Transition ids | `t_NNNN`; unique. |
| Input types | Only: `text`, `number`, `boolean`, `void`, `unknown`. |
| Expr node `type` | Only: `identifier`, `string_literal`, `number_literal`, `boolean_literal`, `call`, `binary`, `logical`. |
| Operators | Binary: `==`, `!=`, `<`, `>`, `<=`, `>=`. Logical: `and`, `or`. |
| Builtins | **Only** names returned by the current toolchain (`TORQA language` / registry snapshot). No synonyms. |

---

## 3. Mandatory metadata

Inside `ir_goal.metadata` every artifact **must** include:

- `ir_version` — exact string equal to toolchain `CANONICAL_IR_VERSION` (e.g. `1.4`).
- `source` — e.g. `python_prototype` (until profile names a new constant).
- `canonical_language` — e.g. `english`.

Omission → `PX_IR_METADATA` / structural failure.

---

## 4. `library_refs` usage

- **Default:** omit `library_refs` for standalone goals.
- **When present:** each item **must** have `name`, `version`; `fingerprint` when org policy or lockfile requires it.
- Do not invent packages; only names approved for the session or lockfile.

---

## 5. Allowed AST / IR shapes

- No extra keys on objects where schema sets `additionalProperties: false`.
- No nested prose fields; use `goal` / `result` for short labels only.
- Transitions: `from_state` and `to_state` **only** `before` or `after`.
- `effect_name` must be a **void** builtin; arguments must match registry arity and types.
- Conditions: only `require` / `forbid` / `postcondition` in the correct sections.

---

## 6. Validate-then-expand loop

**Per session:**

1. Emit **minimal valid** skeleton (see `minimal_valid_bundle` in `authoring_prompt.py`).
2. Run mental or tool checklist: schema → structural → handoff → determinism → semantic.
3. **Expand** one section at a time (preconditions → forbids → transitions → postconditions).
4. On **any** verifier error: fix **only** offending nodes; preserve unrelated ids and structure (**minimal diff**).

**Repair input to model:** Prefer `build_full_diagnostic_report` JSON: use `code` + `phase`, not paraphrased prose.

---

## 7. Failure discipline

- After failure, output **only** the corrected JSON object (no explanation), unless the channel requires a one-line summary.
- Do not rename ids unless the error is collision or format mismatch.
- Do not change `ir_version` to “match” an older example; always match the active toolchain.

---

## 8. Conformance checklist (copy for evals)

- [ ] Single JSON object, `ir_goal` present  
- [ ] `metadata.ir_version` matches canonical  
- [ ] All ids match patterns and are unique  
- [ ] Only registry builtins; void effects only on transitions  
- [ ] No markdown wrapping  
- [ ] Handoff: ASCII, integer numeric literals for handoff profile  
