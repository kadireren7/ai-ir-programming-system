# Quickstart

## What you will do

You will create a tiny **`demo.tq`** file, run a short **`demo.py`** script that **parses** it into a JSON **bundle**, **validates** the structured IR, and prints a **semantic report** so you can see `semantic_ok` and any errors. No runtime or network required—only Python and this repo.

## Install

For **PyPI / pipx / Git installs**, see the README **[Install](../README.md#install)** section.

From a **clone** (contributors), at the **repository root** (folder that contains `pyproject.toml`):

```bash
pip install -e ".[dev]"
# or tests only: pip install -e ".[test]"
```

- **Python 3.10+** (3.12 is used in CI).
- **`[dev]`** includes **`torqa[test]`** (`pytest`, `jsonschema`).
- This installs the **`torqa`** command-line tool (see below).

### If `torqa` is not found (often on Windows)

`pip` puts `torqa.exe` in Python’s **Scripts** directory. If that directory is **not** on your system `PATH`, the shell will say the command is not recognized—even though install succeeded.

**Option A — use the module (no PATH change)** from the **repository root**:

```bash
python -m torqa validate demo.tq
python -m torqa --help
```

Use the same pattern for `check`, `compare`, `doctor`, `explain`, `inspect`, `init`, `report`, `scan`, and `version`.

**Option B — add Scripts to `PATH`**

Print where Scripts lives:

```bash
python -c "import sysconfig; print(sysconfig.get_path('scripts'))"
```

Add that folder to your **user** environment `Path`, then open a **new** terminal. After that, `torqa validate …` should work.

## CLI (terminal)

After install, prefer **`torqa`** when it is on your `PATH`; otherwise use **`python -m torqa`** as above.

Optional **`torqa.toml`** in the project tree sets defaults for **`profile`**, **`fail_on_warning`**, and **`report_format`** when you omit the matching flags. See [Project config](project-config.md).

| Command | What it does |
|---------|----------------|
| `torqa validate FILE` | **`.tq`:** parse → `validate_ir` → semantic + logic → **policy** (`build_policy_report`). **`.json`:** load bundle or bare `ir_goal` → same path. Optional **`--profile default|strict|review-heavy`**. On full pass, states the artifact is **ready for external handoff** (nothing runs here); on failure, **blocked before execution**. **Exit 0** only when structure, semantics, and policy all pass. |
| `torqa check FILE` | **Same checks as `validate`**, but prints only a compact block: **Decision** (`SAFE_TO_HANDOFF` \| `NEEDS_REVIEW` \| `BLOCKED`), **Risk**, **Trust profile**, **Readiness score** (deterministic **0–100** from parse/load, structural + semantic pass, policy pass, risk tier, and review signal), **Top reason**, **Suggested fix** (short, deterministic hints such as missing owner/severity, header order, flow steps, or strict-profile issues), **Suggested next step**. Optional **`--profile`**. **Exit 0** when policy passes (including when Decision is `NEEDS_REVIEW`); **exit 1** when blocked earlier or policy fails. |
| `torqa explain FILE` | Same pipeline as **`validate`**, then **plain-English sections** (no AI): **what this spec does** (goal, inputs, transitions, effects), **why the risk tier is what it is** (from policy reasons and profile), **blocked or approved for handoff**, **what to improve next** (template text from existing errors and `suggested_*` helpers). Optional **`--profile`**. **Exit 0** when policy passes; **exit 1** when blocked earlier or policy fails. |
| `torqa compare FILE` | Load and validate **once**, then run **`build_policy_report`** for **`default`**, **`strict`**, and **`review-heavy`**. Prints a table: **Profile \| Decision \| Risk \| Review \| Notes**. **Exit 1** if the file is missing or the spec stops before policy (same rows repeated); **exit 0** when all three profile evaluations complete. |
| `torqa scan PATH` | Recursively find **`.tq`** and **`.json`** files under **`PATH`** (or evaluate a single **`.tq` / `.json`** file). For each, same trust gate as **`torqa check`** (optional **`--profile`**). Prints **File \| Decision \| Risk \| Profile result** and summary **Total / Safe / Needs review / Blocked**. **Exit 1** if any file is **BLOCKED**; **exit 0** otherwise. |
| `torqa report PATH_OR_FILE --format html` or `--format md` | Same evaluations as **`scan`**. **html:** one standalone page (embedded CSS; no CDN). **md:** Markdown for PRs/CI — **summary**, **blocked files**, **recommendations**, plus full table (reasons + timestamps). **`--output` / `-o`** (defaults: **`torqa-report.html`** or **`torqa-report.md`**). Optional **`--profile`**. **Exit 1** if any file is **BLOCKED**. See [CI reports](ci-report.md). |
| `torqa inspect FILE` | **Stdout:** full canonical **`ir_goal` JSON** only (pipelines, diffs). **Stderr:** `Input type`, `File:`, and notes that stdout is the machine-readable artifact for tooling, review, and pipelines — **no execution**. |
| `torqa doctor FILE` | Human-readable sections: Input, Parse/Load, Structure, Semantics, **Policy**, Summary — **Readiness score: N/100** in **Summary** (same formula as **`torqa check`**); plus **readiness / trust** lines when checks pass; **`Suggested fix:`** lines after failures (same deterministic hints as **`torqa check`**: e.g. **Add metadata owner**, **Use strict tq_v1 header order**, **Use supported flow steps**, **Lower severity or use review path** under **`--profile strict`**). Optional **`--profile`**. |
| `torqa init` | **Interactive wizard** (TTY): prompts for flow name, owner, severity, template, and output path. **Non-interactive:** `torqa init TEMPLATE --output FILE` with **`TEMPLATE`** = `login` \| `approval` \| `onboarding` \| `blank`; optional **`--flow`**, **`--owner`**, **`--severity`**; **`--force`** overwrites an existing file. Writes a **policy-valid** `.tq` starter. |
| `torqa version` | One line: package version and canonical IR version (e.g. `torqa 0.1.0 · canonical IR 1.4`). |

**File types:** extension **`.tq`** uses the reference text parser; **`.json`** accepts a **full bundle** `{"ir_goal": {...}}` (optional `library_refs`), a **bare `ir_goal`** object with the required top-level keys (see `spec/IR_BUNDLE.schema.json`), or a **JSON array of bundles** `[{...}, {...}]` for batch validation (`validate`, `check`, `scan`, `report`). Load and IR errors include **path hints** (e.g. `file.json[1].ir_goal`). **`inspect`**, **`doctor`**, **`explain`**, and **`compare`** expect a **single** bundle per file (not a root array). Malformed JSON or envelope errors fail with a clear message.

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

Examples (replace `torqa` with `python -m torqa` if needed):

```bash
torqa validate demo.tq
torqa validate bundle.json
torqa inspect demo.tq
torqa inspect bundle.json
torqa doctor demo.tq
torqa doctor bundle.json
torqa check demo.tq
torqa check bundle.json
torqa explain demo.tq
torqa explain bundle.json
torqa compare demo.tq
torqa scan ./examples
torqa report . --format html -o trust-report.html
torqa report . --format md -o torqa-report.md
torqa init login --output demo.tq
torqa version
torqa --help
torqa validate --help
torqa check --help
torqa explain --help
torqa compare --help
torqa scan --help
torqa report --help
torqa init --help
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

from torqa.surface.parse_tq import parse_tq_source
from torqa.ir.canonical_ir import ir_goal_from_json, validate_ir
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

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
from torqa.surface.parse_tq import parse_tq_source

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
