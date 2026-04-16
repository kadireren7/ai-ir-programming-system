# Quickstart

## What you will do

You will create a tiny **`demo.tq`** file, run a short **`demo.py`** script that **parses** it into a JSON **bundle**, **validates** the structured IR, and prints a **semantic report** so you can see `semantic_ok` and any errors. No runtime or network required—only Python and this repo.

## Install

- **Python 3.10+** (3.12 is used in CI).
- Clone this repository and open a terminal at the **repository root** (the folder that contains `pyproject.toml`).

```bash
pip install -e ".[dev]"
```

This installs the `torqa` package in editable mode and pulls **pytest** + **jsonschema** for tests and optional schema checks. It also installs the **`torqa`** command-line tool (see below).

## CLI (terminal)

After install, use the **`torqa`** executable on your PATH (or `python -m src.torqa_cli` from the repo root with `PYTHONPATH=.`).

| Command | What it does |
|---------|----------------|
| `torqa validate FILE` | **`.tq`:** parse → `validate_ir` → semantic report. **`.json`:** load bundle or bare `ir_goal` → same validation. **Exit 0** only on full pass. |
| `torqa inspect FILE` | Canonical IR JSON on **stdout** (`ir_goal` envelope). **Stderr:** `Input type: tq` or `json` (for piping). |
| `torqa doctor FILE` | Human-readable diagnostics (load → structural → semantic). |
| `torqa version` | Package version and canonical IR version. |

**File types:** extension **`.tq`** uses the reference text parser; **`.json`** accepts either a **full bundle** `{"ir_goal": {...}}` (optional `library_refs`) or a **bare `ir_goal`** object with the required top-level keys (see `spec/IR_BUNDLE.schema.json`). Malformed JSON or envelope errors fail with a clear message.

Examples:

```bash
torqa validate demo.tq
torqa validate bundle.json
torqa inspect demo.tq
torqa inspect bundle.json
torqa doctor demo.tq
torqa doctor bundle.json
torqa version
torqa --help
torqa validate --help
```

## Create demo.tq

In the **repository root**, create **`demo.tq`** with this exact content (two spaces before `create` and `emit`, not tabs):

```text
intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
```

## Run demo.py

In the same directory as `demo.tq`, create **`demo.py`**:

```python
from pathlib import Path

from src.surface.parse_tq import parse_tq_source
from src.ir.canonical_ir import ir_goal_from_json, validate_ir
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

text = Path("demo.tq").read_text(encoding="utf-8")
bundle = parse_tq_source(text, tq_path=Path("demo.tq"))

print("bundle keys:", sorted(bundle.keys()))
goal = ir_goal_from_json(bundle)
print("IR goal name:", bundle["ir_goal"]["goal"])
print("structural errors:", validate_ir(goal))

report = build_ir_semantic_report(goal, default_ir_function_registry())
print("semantic_ok:", report["semantic_ok"])
print("errors:", report["errors"])
print("warnings:", report["warnings"])
```

Run:

```bash
python demo.py
```

## Expected output

You should see something like:

```text
bundle keys: ['ir_goal']
IR goal name: ExampleFlow
structural errors: []
semantic_ok: True
errors: []
warnings: []
```

- **`structural errors: []`** — IR passes `validate_ir`.
- **`semantic_ok: True`** — Default effect registry and logic checks found no blocking errors.

If anything differs, confirm you are on the repo root, `demo.tq` matches the snippet, and `pip install -e ".[dev]"` succeeded.

### Export JSON and validate without `.tq`

From Python you can dump a bundle and re-check it with the CLI:

```python
import json
from pathlib import Path
from src.surface.parse_tq import parse_tq_source

bundle = parse_tq_source(Path("demo.tq").read_text(encoding="utf-8"), tq_path=Path("demo.tq"))
Path("bundle.json").write_text(json.dumps(bundle, indent=2), encoding="utf-8")
```

```bash
torqa validate bundle.json
```

## What just happened?

1. **Source (`.tq`)** — Text with strict headers and a small `flow:` block.
2. **Bundle** — `parse_tq_source` returns a dict with **`ir_goal`** (JSON-shaped workflow data) plus metadata inside it.
3. **IR** — `ir_goal_from_json` loads typed **`IRGoal`** objects used by validators.
4. **Structural validation** — `validate_ir` checks shape and consistency of that IR.
5. **Semantic report** — `build_ir_semantic_report` checks effects against the **default registry** and runs **logic** rules; the report’s `semantic_ok` tells you if the spec is coherent under those rules.

Execution of real steps (APIs, jobs) does **not** happen here—that would be your application **after** you trust the spec.

## Next steps

- **[Examples](examples.md)** — How teams use Torqa next to real systems.
- **[Concepts](concepts.md)** — `.tq`, bundle, `ir_goal`, structural vs semantic validation.
- **[Architecture](architecture.md)** — Parser → IR → validators → handoff.

To confirm the whole repo: `python -m pytest`.
