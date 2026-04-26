# Contributing to Torqa

Thanks for taking the time to contribute. This project is intentionally small: a **spec core** (IR + validation + trust evaluation), not a runtime or platform. Keeping that boundary clear helps reviews stay fair and fast — and helps **new visitors** trust what they are adopting.

## Why contribute here?

- **High leverage** — Every improvement lands in a **small**, test-backed surface used for **CI gates** and **handoff**.
- **Clear scope** — [Roadmap — non-goals](docs/roadmap.md#explicit-non-goals) says what we **do not** build in-repo.
- **Fast feedback** — Small PRs with tests and changelog notes tend to merge quickly.

## Before you start

1. Skim the **[README](README.md)** (especially [**Try in 2 minutes**](README.md#try-it-in-2-minutes)) and **[docs/roadmap.md](docs/roadmap.md)**.
2. If your idea is **large** (new IR fields, new trust rules, parser surface changes), **open an issue first** — use [Feature request](.github/ISSUE_TEMPLATE/02_feature_request.yml) so maintainers can confirm direction.
3. For **small fixes** (docs, tests, typos), a PR alone is usually enough — still update **[CHANGELOG.md](CHANGELOG.md)** under `[Unreleased]` when users would notice.

## Development setup

**Requirements:** Python **3.10+** (see `pyproject.toml`).

```bash
git clone https://github.com/kadireren7/Torqa.git
cd Torqa
pip install -e ".[dev]"
# minimal test deps only: pip install -e ".[test]"
```

Verify the CLI:

```bash
torqa version
# or: python -m torqa version
```

Run the full test suite before opening a PR:

```bash
python -m pytest
ruff check src tests
```

On Windows, if `torqa` is not on `PATH`, use `python -m torqa` (see [Quickstart — Windows](docs/quickstart.md#if-torqa-is-not-found-often-on-windows)).

Optional: `jsonschema` is pulled in via **`[test]`** / **`[dev]`** for schema-related checks in tests.

## What we value

- **Honest changes** — Docs and tests that match what the code does today.
- **Determinism** — Policy, risk, and CLI output stay stable unless a version bump or migration says otherwise.
- **Respectful discussion** — Disagreement is fine; keep feedback specific and actionable.

## Making a change

- **Match existing style** — Naming, imports, and test patterns in the touched files.
- **Add or update tests** — Behavior changes should have coverage in `tests/`. CLI changes: extend or add `tests/test_cli_*.py` where appropriate.
- **Update docs when users see a difference** — CLI flags, JSON shapes, trust behavior, examples, or README screenshots paths.
- **Update `CHANGELOG.md`** — Under `[Unreleased]`, note user-visible changes (see [Releasing](docs/releasing.md)).
- **Keep diffs focused** — Unrelated refactors make review harder; split cleanup into separate PRs when possible.

## Pull requests

- Use the **[PR template](.github/pull_request_template.md)** (auto-filled on GitHub): what changed, why, checklist.
- Confirm **`python -m pytest` passes** locally.
- If you are unsure about API or IR contract changes, say so in the PR — that speeds feedback.

## What usually does *not* belong here

Aligned with [Roadmap — non-goals](docs/roadmap.md): workflow runtimes, hosted SaaS, bundled LLM products, or “silent” weakening of validation. Proposals that blur those lines may be declined even if well intentioned.

## Security

If you believe you found a **security vulnerability**, please **do not** open a public issue with exploit details. Open a **private security advisory** on GitHub (Maintainers → Security) or contact maintainers per repository settings. See **[SECURITY.md](SECURITY.md)**.

## License

By contributing, you agree that your contributions are licensed under the same terms as the project: **[MIT](LICENSE)**.

## Where to look next

- **[GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md)** — Suggested entry points (honest about difficulty).
- **[docs/architecture.md](docs/architecture.md)** — Layers and where code lives; includes **contribution notes** at the bottom.
- **[docs/status.md](docs/status.md)** — Repository audit, adoption expectations, and pre-v1 gap notes (not a release promise).
- **Issues:** [Bug report](.github/ISSUE_TEMPLATE/01_bug_report.yml) · [Feature](.github/ISSUE_TEMPLATE/02_feature_request.yml) · [Docs](.github/ISSUE_TEMPLATE/03_documentation.yml)
