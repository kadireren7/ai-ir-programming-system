# Your First Successful Torqa Run

Follow these steps once. They assume you already cloned the repo.

## 1. Where to put files

Use the **repository root** (the directory that contains `pyproject.toml` and the `src/` folder).

Put **`demo.tq`** and **`demo.py`** there, side by side.

## 2. One-time setup

```bash
pip install -e ".[dev]"
```

Run that from the repository root.

## 3. Create the two files

**Option A — generate `demo.tq`** (from the repo root, non-interactive):

```bash
python -m torqa init login --output demo.tq
```

Or run **`python -m torqa init`** for the interactive wizard (requires a TTY).

**`demo.tq`** — or copy exactly below (indent with **two spaces** in the `flow:` block):

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

**`demo.py`** — use this minimal script (the [Quickstart](quickstart.md) has a version with more `print` lines):

```python
from pathlib import Path
from torqa.surface.parse_tq import parse_tq_source
from torqa.ir.canonical_ir import ir_goal_from_json, validate_ir
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

bundle = parse_tq_source(Path("demo.tq").read_text(encoding="utf-8"), tq_path=Path("demo.tq"))
goal = ir_goal_from_json(bundle)
print("structural:", validate_ir(goal))
report = build_ir_semantic_report(goal, default_ir_function_registry())
print("semantic_ok:", report["semantic_ok"])
```

## 4. Run

```bash
python demo.py
```

## 5. How to know it worked

You want:

```text
structural: []
semantic_ok: True
```

- Empty **`structural`** list = pass.
- **`semantic_ok: True`** = no semantic errors with the default registry.

If you see that, Torqa parsed and validated your first spec.

## Common mistakes

| Problem | Fix |
|--------|-----|
| `torqa` is not recognized (Windows) | Use `python -m torqa validate demo.tq` or `python -m torqa check demo.tq` from the repo root, or add Python’s **Scripts** folder to your `PATH` (see [Quickstart](quickstart.md#if-torqa-is-not-found-often-on-windows)). |
| `ModuleNotFoundError: src` | Run `pip install -e ".[dev]"` from the **repo root**, then run `python demo.py` again from the same folder. |
| `FileNotFoundError: demo.tq` | Run `python demo.py` from the directory that **contains** `demo.tq`. |
| `PX_TQ_*` parse error | Check **two spaces** before `create session` / `emit login_success` (no tabs). Keep header order: `intent` → `requires` → `result` → `flow:`. |
| `PX_TQ_MISSING_IP` | Include **`ip_address`** in `requires` when using `emit login_success` in this minimal flow. |
| `Policy validation: FAIL` / missing owner or severity | Add a **`meta:`** block with **`owner`** and **`severity`** (see `demo.tq` above) so the CLI can pass **trust policy**; see [Trust policies](trust-policies.md). |
| Old Python | Use **Python 3.10+** (`python --version`). |

Next: [Quickstart](quickstart.md) for the full walkthrough, or [Examples](examples.md) for context.
