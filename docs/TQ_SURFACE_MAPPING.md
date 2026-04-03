# `.tq` surface (tq_v1) → `ir_goal` mapping

Authoritative for **syntax** accepted by `src/surface/parse_tq.py`.

**Quick reference for authors:** [`TQ_AUTHOR_CHEATSHEET.md`](TQ_AUTHOR_CHEATSHEET.md) (order, `flow:` indent, `requires` tips).

## Header order (strict)

1. Optional `module …` (at most once, only as the first header).
2. `intent …` (required).
3. Optional **one or more** `include "relative/path.tq"` lines (after `intent`, before `requires`; each distinct path once; order preserved; path relative to this file’s directory; nested `include` inside a fragment forbidden). See `examples/torqa/example_include_user_login.tq` and `examples/torqa/example_include_chained.tq`.
4. `requires …` (required).
5. Optional **P28** `stub_path <lang> <relpath>` lines (repeatable, at most one per language). `<relpath>` is a single token (no spaces), relative (no leading `/`), no `..`; languages: `rust`, `python`, `sql`, `typescript`, `go`, `kotlin`, `cpp`. Sets `metadata.source_map.projection_stub_paths`. See `examples/torqa/projection_stub_paths_policy.tq`.
6. At most one `forbid locked`.
7. Optional `ensures session.created` (exact clause; once).
8. **`result` or `result …` (required)** before `flow:`.
9. `flow:` (once).

Header keywords are **case-sensitive** (lowercase ASCII only): `module`, `intent`, `include`, `requires`, `stub_path`, `forbid`, `ensures`, `result`, `flow:`.

Parsing `include` requires a **file path** (CLI `surface` / `build`, or `parse_tq_source(..., tq_path=…)`). Raw string-only parse without `tq_path` fails with `PX_TQ_INCLUDE_NEEDS_PATH`.

Successful includes set `metadata.source_map.tq_includes` to the relative paths used (traceability only; same `ir_goal` shape as without include).

Any other order → `PX_TQ_HEADER_ORDER`. Missing `result` → `PX_TQ_MISSING_RESULT`.

## Singleton headers

`module`, `intent`, `requires`, `ensures`, `result`, `flow:` — at most once each (`PX_TQ_DUPLICATE_HEADER` where applicable).  
`include "…"` — each relative path at most once per file (`PX_TQ_INCLUDE_DUPLICATE` on repeat path).  
`forbid locked` — at most one line (`PX_TQ_DUPLICATE_FORBID`).  
`stub_path` — zero or more lines; at most one per language (`PX_TQ_STUB_PATH_DUPLICATE`).

## Header → IR

| Line pattern | `ir_goal` effect |
|--------------|------------------|
| `module <text>` | `metadata.source_map.tq_module` |
| `intent <name>` | `goal` ← PascalCase of `<name>` (`-` in `<name>` is rejected) |
| `include "rel.tq"` | Text splice before parse; `metadata.source_map.tq_includes` |
| `requires a, b, …` | `inputs[]` + fixed precondition expansion |
| `stub_path <lang> <relpath>` | `metadata.source_map.projection_stub_paths[<lang>]` (P28 projection layout) |
| `forbid locked` | one `forbids[]` entry |
| `ensures session.created` | `postconditions[]` when `create session` step exists |
| `result` | `result` ← `"OK"` |
| `result <text>` | `result` ← trimmed text |
| *(no `result` line)* | `PX_TQ_MISSING_RESULT` |

## `flow:` body

- Each step line: **exactly two ASCII spaces**, then one of:
  - `create session`
  - `emit login_success` (requires `ip_address` in `requires` when this step runs)
  - `emit login_success when <ident>` or `emit login_success if <ident>` (P27, same semantics): include the emit **only if** `<ident>` is listed in `requires`, **or** `<ident>` is `ip_address` (optional audit: omit `ip_address` from `requires` to skip the emit). The guard must be `ip_address` or a name from `requires` (`PX_TQ_WHEN_UNKNOWN_IDENT`). At most one emit line total (guarded or not). `when` / `if` are allowed **only** on `emit login_success` (`PX_TQ_WHEN_UNSUPPORTED_STEP`). Malformed / empty guards → `PX_TQ_WHEN_MALFORMED`, `PX_TQ_WHEN_EMPTY`.
- Lines that are two spaces + `# …` are **comments** inside the flow block (skipped; no IR).
- No blank lines inside the block (`PX_TQ_FLOW_BLANK_LINE`).
- Wrong indent → `PX_TQ_FLOW_INDENT`.
- After the last step, only blank lines and full-line `#` comments are allowed (`PX_TQ_CONTENT_AFTER_FLOW`).

Legacy steps (`validate …`, `find user …`, `verify password`) → `PX_TQ_LEGACY_FLOW_STEP`.

## Preconditions from `requires`

Unchanged: `exists` per name, `verify_username(primary)`, `verify_password(primary, password)`; `primary` = first name not in `{password, ip_address}`.

## Comments

Full-line `#` comments and blank lines are ignored in the **header** section and **after** the `flow:` block. Blank lines are **not** allowed inside `flow:`.

## Examples

See `examples/torqa/canonical_*.tq`, `examples/torqa/templates/`, and `examples/torqa/README.md`.
