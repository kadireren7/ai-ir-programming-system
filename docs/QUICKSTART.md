# Quick Start (canonical)

**Goal:** install once, run one command with the **TORQA** CLI, see generated output. **Time:** about 5 minutes if Python is already set up.

## 0. Prerequisites

- **Python 3.10+** on `PATH`
- A shell **at the repository root** (the folder that contains `pyproject.toml`)

**Windows:** use PowerShell or cmd; paths below use `/` for readability — your shell accepts `\` too.

## 1. Install

```bash
pip install -e .
```

Creates the `torqa` command (from `pyproject.toml`). Prefer a venv if you use one for other projects.

## 2. First success (one command)

**Single flow:** `torqa build <your.tq>` — one command from surface spec to generated artifacts (default output dir below).

```bash
torqa build examples/workspace_minimal/app.tq
```

Output goes under `generated_out/` (under `--root`, default the current directory). You should see a **SUCCESS** line and paths to generated artifacts.

## 3. Quick smoke (optional)

```bash
torqa validate examples/core/valid_minimal_flow.json
```

Exit code `0` and `"ok": true` in JSON means the IR bundle shape checks passed.

## 4. What to try next

| Step | Where |
|------|--------|
| **Public flagship trial (command index)** | Run `torqa demo` (repo root) then follow the printout — [FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md) · [`examples/benchmark_flagship/`](../examples/benchmark_flagship/) |
| **Flagship `.tq` → website** | [FIRST_REAL_DEMO.md](FIRST_REAL_DEMO.md) · [`examples/torqa_demo_site/app.tq`](../examples/torqa_demo_site/app.tq) |
| First **.tq** edits | Start from [`examples/torqa/templates/`](../examples/torqa/templates/) (`minimal.tq`, `session_only.tq`, `guarded_session.tq`, `login_flow.tq`, …); see [templates README](../examples/torqa/templates/README.md) |
| Guided **workspace** | [`examples/workspace_minimal/README.md`](../examples/workspace_minimal/README.md) |
| First **IR package** flow | [USING_PACKAGES.md](USING_PACKAGES.md) + [`examples/package_demo/`](../examples/package_demo/) |
| Native **desktop** (`.tq` editor, `torqa` CLI) | `torqa-desktop` after `cd desktop && npm install` — [desktop/README.md](../desktop/README.md) · legacy: `torqa-desktop-legacy` |
| Full doc index | [DOC_MAP.md](DOC_MAP.md) |

## If `torqa` is not found

Windows often installs `torqa.exe` under Python’s `Scripts` folder; if that folder is **not** on `PATH`, the shell will not find `torqa` even after a successful `pip install`.

**Same CLI, no PATH needed** (use the module shim):

```bash
python -m torqa build examples/workspace_minimal/app.tq
```

Equivalent low-level form:

```bash
python -m src.cli.main build examples/workspace_minimal/app.tq
```

Add `…\Python\pythoncore-*\Scripts` to your user `PATH` if you prefer typing `torqa` directly.

## See also

- **After first build:** [FIRST_PROJECT.md](FIRST_PROJECT.md)
- **Maturity / expectations:** [../STATUS.md](../STATUS.md)
- **Releases & versions:** [RELEASE_AND_VERSIONING.md](RELEASE_AND_VERSIONING.md)
