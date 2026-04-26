<div align="center">

# Torqa

**Validate workflow specs before they run** — canonical IR (`ir_goal`), structure, semantics, and **deterministic trust** (policy · risk · profiles). **Not** a runtime, not a hosted service.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://github.com/kadireren7/Torqa/blob/main/pyproject.toml)
[![Packaging CI](https://github.com/kadireren7/Torqa/actions/workflows/packaging.yml/badge.svg)](https://github.com/kadireren7/Torqa/actions/workflows/packaging.yml)
[![PR: Torqa gate](https://github.com/kadireren7/Torqa/actions/workflows/torqa-pr.yml/badge.svg)](https://github.com/kadireren7/Torqa/actions/workflows/torqa-pr.yml)

[**Try in 2 minutes**](#try-it-in-2-minutes) · [**Why Torqa?**](#why-torqa) · [**Install**](#install) · [**Examples**](#examples) · [**Contributing**](#contributing) · [**Docs**](#documentation)

</div>

---

## Try it in 2 minutes

```bash
git clone https://github.com/kadireren7/Torqa.git
cd Torqa
pip install -e ".[dev]"
torqa validate examples/templates/login_flow.tq
torqa version
```

You should see a **PASS** validation and a version line. Then run a directory scan:

```bash
torqa scan examples/templates --profile default
```

**Windows:** if `torqa` is not on `PATH`, use `python -m torqa …` instead ([Quickstart — Windows](docs/quickstart.md#if-torqa-is-not-found-often-on-windows)).

### See it (screenshots)

<p align="center">
  <img src="docs/images/hero-validate.png" alt="torqa validate example: PASS output" width="720" />
</p>

<p align="center">
  <img src="docs/images/hero-version.png" alt="torqa version output" width="520" />
</p>

---

## Why Torqa

| Pain today | What Torqa gives you |
| --- | --- |
| Specs arrive as **prose, ad hoc JSON, or AI drafts** — “valid JSON” is not enough | **Structural + semantic + policy** checks on a **single canonical IR** |
| Teams need a **repeatable handoff gate** before execution | **Exit-code friendly CLI**, JSON for CI, and an [official GitHub Action](docs/github-actions.md) |
| “Strict enough” differs by team / environment | **Trust profiles** (`default`, `strict`, `review-heavy`, `enterprise`) without forking parsers |

**Why now:** specs are increasingly **tool-generated** and **composed** across systems — you need gates that are **deterministic and inspectable**, not vibes. More context: [Why now?](docs/why-now.md).

---

## What you get (at a glance)

| Capability | One-liner |
| --- | --- |
| **Full gate** | `torqa validate file.tq` — load → IR → structure → semantics → policy |
| **Repo / folder sweep** | `torqa scan path/` — batch trust outcomes + JSON for dashboards |
| **Reports** | `torqa report` — Markdown / HTML for PRs and artifacts ([CI reports](docs/ci-report.md)) |
| **Same contract for `.tq` and JSON** | One bundle shape; diff it, store it, gate it |

---

## Install

**Requirements:** Python **3.10+** (3.11+ recommended).

| Method | Command |
| --- | --- |
| **PyPI** (when published) | `pip install torqa` · `pipx install torqa` · `uv pip install torqa` |
| **From Git** | `pip install "git+https://github.com/kadireren7/Torqa.git@main"` |
| **Contributors** | `pip install -e ".[dev]"` (includes `torqa[test]`, **Ruff**, `pytest`, `jsonschema`) |

Use **pip 21.2+** (or **pipx** / **uv**) so extras resolve. The installable Python package is **`torqa`** (under `src/torqa/`); use the **`torqa`** CLI or **`python -m torqa`**. Versioning & releases: [Releasing](docs/releasing.md).

Full command matrix and JSON shapes: **[Quickstart](docs/quickstart.md)** · shortest success path: **[First run](docs/first-run.md)**.

---

## Examples

The **[`examples/`](examples/)** folder is the fastest way to go from clone to real output — see **[`examples/README.md`](examples/README.md)** for a curated map (templates, AI-style JSON, CI notes, and intentional **broken** specs for tests).

- **[Examples guide](docs/examples.md)** — metadata, migration, CI patterns  
- **[`examples/ai_guardrail.md`](examples/ai_guardrail.md)** — command-first walkthrough  

---

## Commands

| Command | Role |
| --- | --- |
| `torqa validate` | Full pipeline; exit `0` only when load, structure, semantics, and policy pass |
| `torqa check` | Compact trust summary (decision, risk, profile, readiness) |
| `torqa scan` / `torqa report` | Directory or multi-spec reports (incl. HTML / Markdown for CI) |
| `torqa compare` | Same file under each built-in profile |
| `torqa explain` | Plain-English sections from existing signals (no LLM in core) |
| `torqa inspect` | Canonical IR JSON on stdout |
| `torqa doctor` | Human-readable diagnostics |
| `torqa init` | Starter `.tq` templates |

**Also in this repo:** optional **`torqa.toml`** ([Project config](docs/project-config.md)) · [GitHub Action](docs/github-actions.md) · [Supabase cloud schema](docs/cloud-backend.md) · [Dashboard MVP](dashboard/README.md).

### n8n workflow exports (static review)

Torqa **does not execute n8n** and does not call your n8n instance. It only reads **exported workflow JSON**. **n8n support is an adapter layer** under `src/torqa/integrations/n8n/`: exports are converted to the same **`ir_goal`** bundle the rest of the CLI validates. Because canonical IR forbids duplicate effect/state transition triples, the adapter uses **one** `integration_external_step` transition; **node-level** detail and static findings live in **`metadata.integration.findings`** and **`metadata.integration.transition_to_node`** (including **`n8n_nodes_ordered`**). **`torqa scan … --source n8n --json`** adds an **`integration`** object whose **`findings`** map issues back to **n8n node ids and names**.

Details: **[`docs/integrations/n8n.md`](docs/integrations/n8n.md)**.

---

## Trust layer (demos)

- **[Guardrail demo](docs/guardrail-demo.md)** — practical framing for AI-generated workflows  
- **[Flagship demo](docs/flagship-demo.md)** — draft → validate → handoff narrative  
- **[Trust layer](docs/trust-layer.md)** — policy, risk, profiles (deep dive)  

---

## Contributing

We welcome **issues** and **PRs** that respect the spec-core boundary.

| Resource | Use it for |
| --- | --- |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Setup, tests, changelog, PR expectations |
| **[GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md)** | Realistic starter tasks by area |
| **[Issue templates](.github/ISSUE_TEMPLATE/)** | Bug reports, features, docs |
| **[Architecture — contributor notes](docs/architecture.md#contributor-notes)** | Where code usually lives |
| **[SECURITY.md](SECURITY.md)** | How to report vulnerabilities responsibly |

---

## Roadmap

**Early core (v0.x):** small API surface, reference Python implementation, no product wraparound. **[Roadmap](docs/roadmap.md)** lists current focus, near-term improvements, long-term *possibilities*, and **explicit non-goals** (no runtime / SaaS / bundled LLM product in this repo).

**Honest status:** [docs/status.md](docs/status.md) — adoption bar and pre-1.0 gaps.

---

## Status & releases

- **[CHANGELOG.md](CHANGELOG.md)** — Keep a Changelog  
- **[Releasing](docs/releasing.md)** — SemVer + PyPI automation  
- **[Early release notes](docs/reports/RELEASE_NOTES_v0.md)** — what “v0” means today  

---

## Architecture

Pipeline and boundaries: **[Diagrams](docs/diagrams.md)** · **[Architecture](docs/architecture.md)**.

### Minimal API example (`.tq` → IR → semantics)

`example.tq` (policy expects **`meta:`** with owner and severity; see [Trust policies](docs/trust-policies.md)):

```text
intent example_flow
requires username, password, ip_address
meta:
  owner example_owner
  severity low
result Done
flow:
  create session
  emit login_success
```

```python
from pathlib import Path

from torqa.surface.parse_tq import parse_tq_source
from torqa.ir.canonical_ir import ir_goal_from_json, validate_ir
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

bundle = parse_tq_source(
    Path("example.tq").read_text(encoding="utf-8"),
    tq_path=Path("example.tq"),
)
goal = ir_goal_from_json(bundle)
assert validate_ir(goal) == []
report = build_ir_semantic_report(goal, default_ir_function_registry())
assert report.get("semantic_ok") is True
```

CLI trust output: **`torqa validate`** — [Quickstart](docs/quickstart.md).

---

## What Torqa is — and is not

**Is:** a **contract** (`ir_goal` + validation + trust evaluation), portable and reviewable.  
**Is not:** a workflow runtime, orchestration engine, hosted service, IDE product, or bundled LLM API. **`.tq`** is a strict authoring path to the same bundle JSON importers use.

---

## Documentation

| Audience | Start here |
| --- | --- |
| **New visitors** | This README → [Try in 2 minutes](#try-it-in-2-minutes) → [examples/](examples/) |
| **Integration / CI** | [Quickstart](docs/quickstart.md) · [GitHub Actions](docs/github-actions.md) · [CI reports](docs/ci-report.md) · [n8n exports](docs/integrations/n8n.md) |
| **Trust model** | [Trust layer](docs/trust-layer.md) · [Trust policies](docs/trust-policies.md) · [Trust profiles](docs/trust-profiles.md) · [Trust scoring](docs/trust-scoring.md) |
| **Concepts & IR** | [Concepts](docs/concepts.md) · [Overview](docs/overview.md) · [FAQ](docs/faq.md) |
| **Product context** | [Use cases](docs/use-cases.md) · [Public launch](docs/public-launch.md) · [Language evolution](docs/language-evolution.md) |

---

## Design principles

- **Canonical IR first** — One **`ir_goal`** shape (versioned bundle) as the interchange **contract**  
- **Validation and trust as gates** — Structure, semantics, policy, and risk are deliberate; outcomes are visible in APIs and CLI output  
- **Portability** — IR is **runtime-agnostic**; execution stays outside this layer  
- **Optional ergonomic authoring** — **`.tq`** maps deterministically to IR when you use it  
- **No silent ambiguity** — Invalid constructs surface as errors with stable codes (e.g. `PX_TQ_*`)  
- **Thin core** — Verifiable spec and trust machinery, not a platform  

---

## License

[MIT](LICENSE)
