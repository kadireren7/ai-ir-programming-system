# CI: validate committed `.tq` specs

Run from the **repository root** after `pip install -e ".[dev]"`. Use `torqa` if it is on your `PATH`; on Windows, if the command is not found, use `python -m torqa` instead (see [Quickstart](../docs/quickstart.md#if-torqa-is-not-found-often-on-windows)).

## Bash / Git Bash (Linux, macOS, WSL)

```bash
torqa validate examples/approval_flow.tq
torqa validate examples/ai_generated.json
```

Validate **all** `.tq` files under `examples/`:

```bash
for f in examples/*.tq; do torqa validate "$f" || exit 1; done
```

Or, if your shell expands globs into arguments:

```bash
torqa validate examples/*.tq
```

> **Note:** POSIX `torqa validate examples/*.tq` passes **one argument per file** only when the glob matches. If there are **no** `.tq` files, the shell may pass the literal `examples/*.tq` and the CLI will fail—avoid that in CI by ensuring at least one file or use the `for` loop.

## Windows PowerShell

```powershell
Get-ChildItem examples\*.tq | ForEach-Object { torqa validate $_.FullName }
```

If `torqa` is not recognized, use the same loop with `python -m torqa`:

```powershell
Get-ChildItem examples\*.tq | ForEach-Object { python -m torqa validate $_.FullName }
```

## Why this helps teams

- **Same bar everywhere:** Every push runs the same structural + semantic checks as local development.
- **Fail fast:** Invalid specs are caught before review or deployment—not at runtime.
- **Deterministic:** The reference parser and IR validators give stable outcomes for the same files.

Torqa does **not** run your workflows here; it only proves the **spec** is acceptable input for whatever executes downstream.
