# Torqa `.tq` examples

These files are **canonical surface** examples: one spelling, one shape per concept (e.g. only `emit login_success` for the audit step). Full header → IR rules: `docs/TQ_SURFACE_MAPPING.md`. The parser enforces strict header order, two-space flow indent, and only `create session` / `emit login_success` steps (no legacy no-op lines).

## `canonical_minimal.tq`

**Purpose:** Smallest valid login-oriented file: declare intent and inputs, explicit `result OK`, empty `flow:`.

**IR highlights:**

- `ir_goal.goal` → `DemoIdle` (from `intent demo_idle`).
- `ir_goal.inputs` → `username`, `password` (each `type: "text"`).
- `ir_goal.preconditions` → `exists` per input, then `verify_username(username)`, `verify_password(username, password)`.
- `ir_goal.transitions` → `[]`.
- `ir_goal.forbids` / `ir_goal.postconditions` → `[]`.
- `ir_goal.result` → `"OK"` (from `result OK`; no transition steps).
- `ir_goal.metadata.source_map` → `surface: "tq_v1"` only (no `tq_module`).

**Starter copies:** `examples/torqa/templates/` (`minimal.tq`, `minimal_form.tq`, `session_only.tq`, `guarded_session.tq`, `login_flow.tq`, `validation_rich_login.tq`). One-page reminders: `docs/TQ_AUTHOR_CHEATSHEET.md`.

## `canonical_session_flow.tq`

**Purpose:** Full **state + action** path: forbid rule, session effect, successful-login log effect, postcondition, explicit result.

**IR highlights:**

- `ir_goal.goal` → `UserLogin`.
- `ir_goal.inputs` → `username`, `password`, `ip_address`.
- `ir_goal.preconditions` → same expansion pattern as minimal, with three `exists` rows and `verify_*` on primary field `username`.
- `ir_goal.forbids` → one `forbid` on `user_account_status(username) == "locked"`.
- `ir_goal.transitions` → `start_session(username)` then `log_successful_login(username, ip_address)` (second transition chained on `after`).
- `ir_goal.postconditions` → `session_stored_for_user(username)` (because `ensures session.created` and `create session` is present).
- `ir_goal.result` → `"Login completed"`.
- `ir_goal.metadata.source_map.tq_module` → `auth.session`.

## `canonical_view_login.tq`

**Purpose:** Same control flow as `canonical_session_flow.tq`, but **`module` names a view-facing path** so projections can route UI assets. There is no separate `view` syntax in `tq_v1`.

**IR highlights:** Same structure as `canonical_session_flow.tq`, except:

- `ir_goal.metadata.source_map.tq_module` → `web.views.login`.
- `ir_goal.result` → `"Signed in"`.

## `include` reuse

`example_include_user_login.tq` pulls shared `requires` / `forbid locked` from `modules/login_inputs.tq` via one `include "modules/login_inputs.tq"` line (after `intent`, before `requires`). See `docs/TQ_SURFACE_MAPPING.md`.

## Legacy examples

`auth_login.tq` and `signin_flow.tq` remain for older tooling and tests; prefer the `canonical_*.tq` files for new authors.
