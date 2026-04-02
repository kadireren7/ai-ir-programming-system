# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where applicable.

IR interchange versioning is separate from package semver — see [`docs/IR_VERSIONING.md`](docs/IR_VERSIONING.md) and bump checklist when changing `CANONICAL_IR_VERSION`.

## [Unreleased]

## [1.0.0] - 2026-04-02

First **production semver** aligned with [`docs/TORQA_VISION_NORTH_STAR.md`](docs/TORQA_VISION_NORTH_STAR.md) §7: green CI (`pytest`, Rust, Vite smoke), single CLI + `src/torqa_public.py` entry surface, `torqa project` / materialize + zip API, `docs/PACKAGE_SPLIT.md` core API, `CHANGELOG` + README discipline, and a minimal `packages/js/torqa-types` stub for future `@torqa/*` publishing.

### Added

- **Packages:** `packages/js/torqa-types/` placeholder `package.json` + README (schema path from monorepo root).

### Changed

- Package version **1.0.0** (IR versioning remains per [`docs/IR_VERSIONING.md`](docs/IR_VERSIONING.md)).

## [0.1.0] - 2026-04-02

### Added

- **F1 / F2 roadmap:** `torqa project` supports `--root`, `--source`, `.tq`/`.pxir` sources; JSON summary includes `written` and `errors`; shared `src/project_materialize.py` and `src/torqa_public.py`.
- **F3:** Web API `POST /api/materialize-project-zip` (zip download, no server path arguments).
- **F4:** Maintainer verify doc, codegen inventory, package split doc, web security doc, path sanitization for artifact names.
- **F5:** `examples/packages/demo_lib/` sample + consuming bundle test; preview-package template doc.
- **Workspace example:** `examples/workspace_minimal/` with two-command README.

### Changed

- Package version set to **0.1.0** (initial “shaped release” marker alongside IR 1.4).

