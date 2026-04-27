<div align="center">

# Torqa

**Ship workflow automations with confidence before anything executes.**

Canonical workflow IR + structural/semantic validation + deterministic trust scoring + CI-ready CLI.

> **Torqa is a gate, not a runtime.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://github.com/kadireren7/Torqa/blob/main/pyproject.toml)
[![Packaging CI](https://github.com/kadireren7/Torqa/actions/workflows/packaging.yml/badge.svg)](https://github.com/kadireren7/Torqa/actions/workflows/packaging.yml)
[![PR: Torqa gate](https://github.com/kadireren7/Torqa/actions/workflows/torqa-pr.yml/badge.svg)](https://github.com/kadireren7/Torqa/actions/workflows/torqa-pr.yml)

[Quickstart](#2-minute-quickstart) · [n8n Demo](#n8n-quick-demo) · [CLI](#cli-examples) · [GitHub Action](#github-action-usage) · [Dashboard](#torqa-dashboard--first-users) · [Docs](#documentation)

</div>

---

## Torqa Dashboard & first users

**Product positioning:** Torqa is the **deterministic gate** for workflow specs (validate, score, policy-check) before anything runs in production. The **Next.js dashboard** (`dashboard/`) is the team surface: scan uploads (including n8n JSON), **workspace policies**, **schedules**, **alerts**, **insights**, **API keys**, and **shareable reports** — all optional until you wire **Supabase** (see [dashboard/README.md](dashboard/README.md)).

- **Live demo (hosted):** this repository does not ship a fixed production URL. After you deploy, document your canonical URL (for example `https://your-torqa.example.com`) in your runbook and in `NEXT_PUBLIC_APP_URL`.
- **Local demo:** `cd dashboard && npm install && npm run dev` → [http://localhost:3000](http://localhost:3000) (landing at `/`; app routes under `/overview`, `/scan`, etc.).
- **Launch QA:** [docs/launch-checklist.md](docs/launch-checklist.md) — routes, smoke tests, migrations, env vars, and production limitations.

---

## Why Torqa

Most teams have workflow definitions from prose, ad-hoc JSON, LLM output, or vendor exports.
“It parses” is not enough for safe production handoff.

Torqa gives you a deterministic gate:

- **One canonical contract:** `ir_goal` bundle shape for review, diff, storage, and CI.
- **Multi-layer validation:** structural (`validate_ir`), semantics, logic, policy, and trust scoring.
- **Profile-aware enforcement:** `default`, `strict`, `review-heavy`, `enterprise`.
- **Automation-native output:** stable JSON schemas, predictable exit codes, GitHub Action support.

---

## What Torqa catches

- malformed or incomplete workflow specs before runtime
- semantic mismatch between transitions, conditions, and function signatures
- trust/policy issues (missing metadata, risky severity posture, governance gaps)
- advanced static concerns (retry strategy, observability, execution ordering, circular dependencies)
- n8n export risks (credentials, code nodes, webhook exposure, HTTP handling, missing manual gates)

---

## 2-minute quickstart

From repo root:

```bash
git clone https://github.com/kadireren7/Torqa.git
cd Torqa
pip install -e ".[dev]"
torqa validate examples/templates/login_flow.tq
torqa scan examples/templates --profile default
```

Expected outcome: `Result: PASS` for `login_flow.tq` and a trust summary for the scan.

If `torqa` is not on `PATH` (common on Windows), use:

```bash
python -m torqa validate examples/templates/login_flow.tq
```

---

## Environment Setup

Copy the example file:

```bash
cp .env.example .env
```

Then edit `.env` for your machine. Values are optional until you use features that read them (for example the dashboard or future Supabase/API integrations). The committed `.env.example` documents planned variables; **do not** commit `.env`.

---

## n8n quick demo

Torqa does **not** execute n8n workflows. It statically reviews exported workflow JSON.

```bash
torqa validate examples/integrations/minimal_n8n.json --source n8n
torqa scan examples/integrations/customer_support_n8n.json --source n8n
torqa import n8n examples/integrations/customer_support_n8n.json --out customer_support.bundle.json
```

Why this is useful:

- findings map back to **n8n node names / ids / types**
- findings include **severity** and **fix suggestions**
- converted bundle can run through normal Torqa validation without `--source`

See: [docs/integrations/n8n.md](docs/integrations/n8n.md)

---

## CLI examples

```bash
# Core gate
torqa validate flow.tq
torqa validate bundle.json --profile strict

# Batch confidence
torqa scan . --profile review-heavy
torqa report . --format md -o torqa-report.md
torqa compare flow.tq
torqa explain flow.tq

# Bootstrap
torqa init login --output starter.tq

# n8n adapter
torqa validate workflow.json --source n8n
torqa scan workflow.json --source n8n --json
torqa import n8n workflow.json --out workflow.bundle.json
```

---

## GitHub Action usage

Use the built-in composite action for CI gating:

```yaml
permissions:
  contents: read
  pull-requests: write

steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/torqa
    with:
      torqa-package-path: .
      scan-path: examples/templates
      profile: default
      fail-on-warning: false
      upload-artifact: true
      comment-on-pr: true
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

Full reference: [docs/github-actions.md](docs/github-actions.md)

---

## Architecture overview

```text
source (.tq / json / n8n export)
  -> surface parser / adapter
  -> canonical ir_goal
  -> structural validation
  -> semantics + logic
  -> policy + trust scoring
  -> CLI / JSON report / CI decision
```

Core package layout:

- `src/torqa/ir/`
- `src/torqa/surface/`
- `src/torqa/semantics/`
- `src/torqa/policy/`
- `src/torqa/analysis/`
- `src/torqa/integrations/`
- `src/torqa/cli/`

---

## Not a runtime

Torqa **does not** orchestrate tasks, execute workflows, host jobs, or call LLM APIs by default.
It validates and scores workflow specs so your runtime can execute with stronger guarantees.

---

## Roadmap

- polish adapter ecosystem beyond n8n
- deepen policy customization and org-specific guardrails
- tighten CI/report ergonomics for multi-repo adoption
- keep core deterministic and source-agnostic

See: [docs/roadmap.md](docs/roadmap.md) and [docs/status.md](docs/status.md)

---

## Contributing

Issues and PRs are welcome.

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md)
- [SECURITY.md](SECURITY.md)
- [docs/architecture.md](docs/architecture.md)

---

## Documentation

- [Quickstart](docs/quickstart.md)
- [First run](docs/first-run.md)
- [Trust layer](docs/trust-layer.md)
- [Trust policies](docs/trust-policies.md)
- [Trust scoring](docs/trust-scoring.md)
- [CI reports](docs/ci-report.md)
- [n8n integration](docs/integrations/n8n.md)

---

## License

[MIT](LICENSE)
