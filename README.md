<div align="center">

# Torqa

**Torqa is a governance gate for automation workflows.**

For teams using n8n and workflow JSON in CI, Torqa helps you catch policy and risk issues before runtime.

In 60 seconds you can run:
- `torqa quickstart`
- `torqa validate examples/integrations/minimal_n8n.json --source n8n`
- `torqa report examples/integrations --format html -o torqa-report.html`

Strongest path today: `n8n export -> scan -> risk/policy report -> share or schedule`.

> Torqa is a gate, not a runtime.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://github.com/kadireren7/Torqa/blob/main/pyproject.toml)
[![Packaging CI](https://github.com/kadireren7/Torqa/actions/workflows/packaging.yml/badge.svg)](https://github.com/kadireren7/Torqa/actions/workflows/packaging.yml)
[![PR: Torqa gate](https://github.com/kadireren7/Torqa/actions/workflows/torqa-pr.yml/badge.svg)](https://github.com/kadireren7/Torqa/actions/workflows/torqa-pr.yml)

[Quickstart](#2-minute-quickstart) · [n8n Demo](#n8n-quick-demo) · [CLI](#cli-examples) · [GitHub Action](#github-action-usage) · [Dashboard](#torqa-dashboard--first-users) · [Docs](#documentation)

</div>

---

## Torqa Dashboard & first users

**Product positioning:** Torqa is the **deterministic gate** for workflow specs (validate, score, policy-check) before anything runs in production. The **Next.js dashboard** (`dashboard/`) is the team surface: scan uploads (including n8n JSON), **workspace policies**, **schedules**, **alerts**, **insights**, **API keys**, and **shareable reports** — all optional until you wire **Supabase** (see [dashboard/README.md](dashboard/README.md)).

**v0.1.7 direction:** Automation-first dashboard — connect sources (n8n, GitHub, webhook), monitor workflows continuously, enforce policies on every run, and notify your team on failures. Manual scan is preserved as an advanced option. See [docs/automation-first-roadmap.md](docs/automation-first-roadmap.md) and [docs/connectors.md](docs/connectors.md).

**v0.1.6:** dashboard automation (cron, onboarding, webhooks, alerts), operator packaging (Docker/Helm), and **PyPI-ready** CLI distribution (`pip install torqa`). See [CHANGELOG.md](CHANGELOG.md) and [docs/release-process.md](docs/release-process.md).

- **Live demo (hosted):** this repository does not ship a fixed production URL. After you deploy, document your canonical URL (for example `https://your-torqa.example.com`) in your runbook and in `NEXT_PUBLIC_APP_URL`.
- **Local demo:** `cd dashboard && npm install && npm run dev` → [http://localhost:3000](http://localhost:3000) (landing at `/`; app routes under `/overview`, `/scan`, etc.).
- **Bootstrap helper:** `./scripts/bootstrap-dashboard.sh --with-supabase` (macOS/Linux) or `.\scripts\bootstrap-dashboard.ps1 -WithSupabase` (Windows PowerShell) to install dashboard deps and apply local Supabase migrations in one run.
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

## Install Torqa (Python CLI)

| Goal | Command |
|------|---------|
| **Stable (PyPI)** — when `torqa` is published | `pip install torqa` or `pipx install torqa` |
| **Dev / tests from PyPI** (ruff + pytest extras) | `pip install "torqa[dev]"` or `pip install "torqa[test]"` for tests only |
| **Pre-release / dry run** | `pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ torqa==<version>` (see [docs/release-process.md](docs/release-process.md)) |
| **From this repo (editable)** | `pip install -e ".[dev]"` from repository root |
| **From Git tag** (no PyPI) | `pip install "git+https://github.com/kadireren7/Torqa.git@v0.1.6"` |

After any install, run `torqa version` (or `python -m torqa version`) to confirm the distribution.

---

## 2-minute quickstart

From repo root (contributors / editable install):

```bash
git clone https://github.com/kadireren7/Torqa.git
cd Torqa
pip install -e ".[dev]"
torqa quickstart
torqa validate examples/integrations/minimal_n8n.json --source n8n
torqa scan examples/integrations/customer_support_n8n.json --source n8n
torqa report examples/integrations --format html -o torqa-report.html
```

Expected outcome: one safe n8n validation pass, one risky n8n scan with findings, and a shareable report artifact.

If `torqa` is not on `PATH` (common on Windows), use:

```bash
python -m torqa quickstart
python -m torqa validate examples/integrations/minimal_n8n.json --source n8n
```

`torqa quickstart` uses a **bundled** n8n sample when installed from PyPI (or your git checkout’s `examples/` when developing from the repo). It prints decision/risk summary and can generate a report artifact with `--report`.

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
torqa report examples/integrations/customer_support_n8n.json --format md -o customer_support_report.md
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

steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/torqa
    with:
      torqa-package-path: .
      scan-path: examples/integrations
      profile: default
      upload-artifact: true
```

Optional PR summary comment (already supported by the action):

```yaml
permissions:
  contents: read
  pull-requests: write

steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/torqa
    with:
      torqa-package-path: .
      scan-path: examples/integrations
      profile: default
      upload-artifact: true
      comment-on-pr: true
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

Full reference: [docs/github-actions.md](docs/github-actions.md)

---

## Public API and report contract

- Public scan API (`POST /api/public/scan`) uses envelope responses by default:
  - success: `{ ok: true, data, meta }`
  - error: `{ ok: false, error, meta }`
- Legacy raw response mode remains available via `?legacy=1`.
- `torqa report` supports `html`, `md`, and `json` output (`torqa.report.v1` for JSON artifacts).

Details: [docs/api.md](docs/api.md)

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

### Why trust Torqa?

- **Deterministic analysis:** same input yields the same result.
- **No workflow execution:** Torqa inspects definitions; it does not run your automations.
- **No default LLM calls:** baseline scan path stays explicit and auditable.
- **Explicit engine metadata:** reports include engine/mode metadata for every scan.
- **Inspectable reasons:** risk and policy outcomes are tied to concrete findings.

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

- [Docs index](docs/README.md)
- [Quickstart](docs/quickstart.md)
- [First run](docs/first-run.md)
- [Trust layer](docs/trust-layer.md)
- [Trust policies](docs/trust-policies.md)
- [Trust scoring](docs/trust-scoring.md)
- [CI reports](docs/ci-report.md)
- [n8n integration](docs/integrations/n8n.md)
- [Public API contract](docs/api.md)

---

## License

[MIT](LICENSE)
