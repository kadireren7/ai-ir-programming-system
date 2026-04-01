# Contributing — TORQA

## Canonical code layout

- **Libraries and pipelines** live under `src/`. Import from the `src.*` package (e.g. `from src.ir.canonical_ir import IRGoal`).
- **Root-level `*.py` files** (e.g. `system_orchestrator.py`) are **thin shims** that re-export `src` modules for backward compatibility. New code should not add business logic there.

## Running checks

```bash
pip install -r requirements-dev.txt
python -m pytest
```

```bash
cargo test --manifest-path rust-core/Cargo.toml
```

## Web console

```bash
pip install -r requirements.txt
uvicorn webui.app:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`.

Optional AI features require `OPENAI_API_KEY` in the environment where uvicorn runs.

## CLI (editable install)

```bash
pip install -e ".[dev]"
torqa --help
```

## IR contract

Authoritative description: `docs/CORE_SPEC.md`. Machine-readable shape: `spec/IR_BUNDLE.schema.json`. Add or change golden files under `examples/core/` and extend tests when you evolve the contract.

## Language policy for this repository

**New** documentation, UI strings, comments in new modules, and example data should be **English** unless a file is explicitly scoped to another locale.
