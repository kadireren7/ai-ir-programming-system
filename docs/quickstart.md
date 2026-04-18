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

### If `torqa` is not found (often on Windows)

`pip` puts `torqa.exe` in Python’s **Scripts** directory. If that directory is **not** on your system `PATH`, the shell will say the command is not recognized—even though install succeeded.

**Option A — use the module (no PATH change)** from the **repository root**:

```bash
python -m src.torqa_cli validate demo.tq
python -m src.torqa_cli --help
```

Use the same pattern for `doctor`, `inspect`, and `version`.

**Option B — add Scripts to `PATH`**

Print where Scripts lives:

```bash
python -c "import sysconfig; print(sysconfig.get_path('scripts'))"
```

Add that folder to your **user** environment `Path`, then open a **new** terminal. After that, `torqa validate …` should work.

## CLI (terminal)

After install, prefer **`torqa`** when it is on your `PATH`; otherwise use **`python -m src.torqa_cli`** as above.

| Command | What it does |
|---------|----------------|
| `torqa validate FILE` | **`.tq`:** parse → `validate_ir` → semantic + logic → **policy** (`build_policy_report`). **`.json`:** load bundle or bare `ir_goal` → same path. Optional **`--profile default|strict|review-heavy`**. On full pass, states the artifact is **ready for external handoff** (nothing runs here); on failure, **blocked before execution**. **Exit 0** only when structure, semantics, and policy all pass. |
| `torqa inspect FILE` | **Stdout:** full canonical **`ir_goal` JSON** only (pipelines, diffs). **Stderr:** `Input type`, `File:`, and notes that stdout is the machine-readable artifact for tooling, review, and pipelines — **no execution**. |
| `torqa doctor FILE` | Human-readable sections: Input, Parse/Load, Structure, Semantics, **Policy**, Summary — plus **readiness / trust** lines when checks pass. Optional **`--profile`**. |
| `torqa version` | One line: package version and canonical IR version (e.g. `torqa 0.1.0 · canonical IR 1.4`). |

**File types:** extension **`.tq`** uses the reference text parser; **`.json`** accepts either a **full bundle** `{"ir_goal": {...}}` (optional `library_refs`) or a **bare `ir_goal`** object with the required top-level keys (see `spec/IR_BUNDLE.schema.json`). Malformed JSON or envelope errors fail with a clear message.

**Example (`torqa validate` success):**

```text
Input type: tq
File: demo.tq

Parse: OK
Structural validation: PASS
Semantic validation: PASS
Logic validation: PASS

Trust profile: default
Policy validation: PASS
Review required: no
Risk level: low
Why:
  - Within current heuristics: owner and severity present, at most five transitions, severity not high.

Result: PASS
Handoff: validated artifact ready for external handoff.
```

Files without **`meta:`** / `surface_meta.owner`+`severity` fail **policy** while still passing structure and semantics—see [Trust policies](trust-policies.md).

Examples (replace `torqa` with `python -m src.torqa_cli` if needed):

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
meta:
  owner local_dev
  severity low
result Done
flow:
  create session
  emit login_success
```

The **`meta:`** block supplies `surface_meta` so **`torqa validate`** passes **policy** checks (see [Trust policies](trust-policies.md)).

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
