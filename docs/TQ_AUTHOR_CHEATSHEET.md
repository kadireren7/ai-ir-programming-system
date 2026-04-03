# `.tq` author cheatsheet (tq_v1)

One-page reminder. Full rules: [`TQ_SURFACE_MAPPING.md`](TQ_SURFACE_MAPPING.md).

## Header order (do not reorder)

1. Optional `module dotted.name` (only as first header).
2. `intent snake_case_name` (required; hyphens in the name are rejected).
3. Optional: one or more `include "relative.tq"` lines (after `intent`, before `requires`; same path only once; needs file path when parsing).
4. `requires a, b, c` (required; comma-separated identifiers).
5. Optional P28: `stub_path <lang> <relpath>` (repeat; one path per language) — projection stub output paths; see `examples/torqa/projection_stub_paths_policy.tq`.
6. At most one `forbid locked`.
7. Optional `ensures session.created` (exact text).
8. `result` or `result Your message` (required before `flow:`).
9. `flow:` then step lines.

Keywords are **lowercase only** (`intent` not `Intent`; `flow:` not `Flow:`).

## `flow:` body

- The header is exactly **`flow:`** (lowercase `flow` plus colon). A line `flow` without `:` is invalid.
- Each step: **exactly two ASCII spaces**, then `create session`, `emit login_success`, or `emit login_success when <ident>` / `emit login_success if <ident>` (**when** and **if** are the same guard; use whichever reads more clearly).
- Guard rule unchanged: include emit only if `<ident>` is in `requires`, or use `when`/`if` `ip_address` and omit `ip_address` from `requires` to skip audit.
- You may add **indented** comment lines: two spaces + `# …` inside the block.
- Do not repeat the same step twice (one `create session`; at most one `emit login_success` line, guarded or not).
- No blank lines inside the block.
- After the last step: only blank lines or full-line `#` comments.

## Login-oriented `requires`

- List names **after** `requires`, separated by **commas** (not spaces): `requires username, password`. Double commas or a missing name between commas are rejected.
- First field that is not `password` or `ip_address` is the **primary** (used for `verify_username` / `verify_email` style checks).
- Sign-in flows with `emit login_success` (unconditional) need `ip_address` in `requires`. With `emit login_success when ip_address`, you can omit `ip_address` to skip the audit effect (see `examples/torqa/templates/optional_audit_login.tq`).

## Copy-paste templates

See `examples/torqa/templates/`.

## Check your file

```bash
torqa surface your_file.tq
```

Machine-readable JSON (global flag **before** `surface`): `torqa --json surface your_file.tq`
