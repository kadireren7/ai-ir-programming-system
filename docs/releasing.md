# Releasing Torqa

This document describes **semantic versioning**, how to **cut a release**, and how **CI** publishes to PyPI.

---

## Semantic versioning (SemVer)

Torqa follows **[Semantic Versioning 2.0.0](https://semver.org/)** with the usual **0.x** semantics:

| Segment | Meaning (while major is `0`) |
| --- | --- |
| **MAJOR** (`0`) | Pre–1.0: the public contract (CLI flags, JSON diagnostics, IR expectations) may still evolve. Bumping to **`1.0.0`** freezes a stability story documented in CHANGELOG + status docs. |
| **MINOR** (`y`) | New features, new CLI subcommands or flags (backward-compatible where reasonable), non-breaking trust tuning that stays within documented behavior. |
| **PATCH** (`z`) | Bug fixes, docs, performance, internal refactors with no intended user-visible behavior change. |

**Pre-releases** (optional): tag `v0.2.0a1` or `v0.2.0rc1` for testers; `pip` orders them correctly before final `v0.2.0`.

**After 1.0.0:** follow strict SemVer — breaking CLI or bundle contract → **MAJOR** bump.

---

## Single source of truth

- **Version string:** `pyproject.toml` → `[project] version = "x.y.z"`.
- **Runtime:** `torqa version` uses `importlib.metadata.version("torqa")` — it always matches the installed distribution.
- **Changelog:** add a **`[x.y.z]`** section in `CHANGELOG.md` before tagging (see below).

Optional later improvement: derive version from Git tags with **setuptools-scm** (not enabled today to keep builds deterministic without tags).

---

## Changelog discipline

We follow **[Keep a Changelog](https://keepachangelog.com/)** (see `CHANGELOG.md`):

1. Under **`[Unreleased]`**, add bullets while you develop (`Added`, `Changed`, `Fixed`, `Removed` as appropriate).
2. When cutting a release, **rename** `[Unreleased]` to `[x.y.z] — YYYY-MM-DD`, and add a fresh empty **`[Unreleased]`** at the top.
3. At the bottom of `CHANGELOG.md`, add **compare links** for the new tag (see existing pattern).

---

## Maintainer checklist (manual release)

1. **Branch hygiene:** merge to `main`, CI green.
2. **Version bump:** edit `pyproject.toml` `version = "x.y.z"`.
3. **Changelog:** move `[Unreleased]` → `[x.y.z]`, add new `[Unreleased]`, update compare links.
4. **Commit:** e.g. `chore: release 0.1.1`.
5. **Tag:** `git tag -s v0.1.1 -m "Release 0.1.1"` (signing optional but recommended).
6. **Push:** `git push origin main && git push origin v0.1.1`.

The **[Release](../.github/workflows/release.yml)** workflow builds with `python -m build` and uploads to **PyPI** using **OIDC** (no long-lived API token in GitHub secrets if Trusted Publishing is configured).

### One-time PyPI setup

1. Create the **`torqa`** project on PyPI (or your chosen distribution name if `torqa` is unavailable).
2. Enable **Trusted Publishing** → link this GitHub repository + workflow environment (`release`).
3. In GitHub: **Settings → Environments → `release`** — restrict to `main` and required reviewers if you want a manual gate.

Until PyPI is configured, maintainers can still **`python -m build`** and **`twine upload dist/*`** locally with API tokens (avoid committing secrets).

---

## Local dry run

```bash
pip install build twine
python -m build
python -m twine check dist/*
pip install dist/torqa-*.whl
torqa version
```

---

## Install surfaces (for users)

Documented in the README **Install** section:

- **`pip install torqa`** — once published on PyPI.
- **`pipx install torqa`** — isolated CLI on `$PATH`.
- **`uv tool install torqa`** / **`uv pip install torqa`** — fast resolver paths.
- **From Git:** `pip install "git+https://github.com/ORG/REPO.git@v0.1.0"`.

---

## Import layout note

The installable Python package is **`torqa`** (under `src/torqa/` on disk). Library code imports **`torqa.ir`**, **`torqa.surface`**, etc. End users typically use the **`torqa`** console script or **`python -m torqa`** as documented.
