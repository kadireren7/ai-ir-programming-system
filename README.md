# TORQA

**AI-native core language for software systems.**

**Kuzey yıldızı (asıl fikir — önce bunu oku):** [`docs/TORQA_VISION_NORTH_STAR.md`](docs/TORQA_VISION_NORTH_STAR.md) — AI’nın **TORQA/IR** ile az tokenla yazması, doğrulama, güncel dillerin **çıktı katmanı** olması; spec dosyaları silinmez, bu belge **yön** özetidir. **Sürüm notları:** [`CHANGELOG.md`](CHANGELOG.md) · **Bakımcı doğrulama:** [`docs/MAINTAINER_VERIFY.md`](docs/MAINTAINER_VERIFY.md).

TORQA is not a language for imitating human code. It is a **semantic-first core language for AI-built systems** — a canonical representation layer where **explicit semantics, validation, and deterministic structure** take precedence over syntax-shaped imperative text.

## Happy path (minimal workspace)

**Flow:** `.tq` (or IR JSON) → parse/load → full diagnostics → orchestrator writes a **materialized tree** under `--root` / `--out`.

Install the CLI (repository root):

```bash
pip install -e .
```

**Starter source file:** [`examples/workspace_minimal/app.tq`](examples/workspace_minimal/app.tq). Details: [`examples/workspace_minimal/README.md`](examples/workspace_minimal/README.md).

**Materialize** (writes artifacts under `generated_out/` relative to `--root`; exact paths depend on the bundle, often including `generated/webapp/` when a webapp is emitted):

```bash
torqa project --root . --source examples/workspace_minimal/app.tq --out generated_out --engine-mode python_only
```

**Optional — compile `.tq` to IR JSON on disk**, then project from that file (same parser as `project` uses for `.tq`):

```bash
torqa surface examples/workspace_minimal/app.tq --out ir_bundle.json
torqa project --root . --source ir_bundle.json --out generated_out --engine-mode python_only
```

If `torqa` is not on `PATH`, use `python -m src.cli.main` instead of `torqa` (same entrypoint as `pyproject.toml` `[project.scripts]`).

### Validate (JSON IR bundle only)

`torqa validate` and `python scripts/validate_bundle.py` read **IR bundle JSON**, not `.tq`.

```bash
torqa validate examples/core/valid_minimal_flow.json
python scripts/validate_bundle.py examples/core/valid_minimal_flow.json
```

For a `.tq` file: use `torqa surface FILE.tq` (stderr/stdout includes diagnostics) or `torqa project --source FILE.tq` (non-zero exit and JSON summary if validation fails before write).

`torqa bundle-lint` summarizes issue counts by `formal_phase` (exit 1 if not ok). `torqa language --minimal-json` prints a minimal canonical `ir_goal` JSON (stable `sort_keys`).

### Authoritative entry surfaces

| Surface | Location / role |
|---------|------------------|
| CLI | `torqa` → [`src/cli/main.py`](src/cli/main.py) |
| Python API (embed) | [`src/torqa_public.py`](src/torqa_public.py) — contract in [`docs/PACKAGE_SPLIT.md`](docs/PACKAGE_SPLIT.md) |
| IR envelope + types | [`src/ir/canonical_ir.py`](src/ir/canonical_ir.py), [`spec/IR_BUNDLE.schema.json`](spec/IR_BUNDLE.schema.json) |
| Full diagnostic report | [`src/diagnostics/report.py`](src/diagnostics/report.py) (`build_full_diagnostic_report`) |
| Materialize to disk | [`src/project_materialize.py`](src/project_materialize.py) (`materialize_project`; used by `torqa project`) |

Legacy import shims: [`compat/`](compat/) (e.g. `python -m compat.torqa_cli`). Prefer `torqa` or `src.*` / `torqa_public` for new work.

### IDE (VS Code / Cursor)

Open **`Torqa.code-workspace`** via *File → Open Workspace from File…* so the sidebar folder label reads **TORQA** and the window title includes **TORQA** (your disk folder may still be named `Project-X`). Optional: rename the parent folder on disk to `torqa` yourself for consistency.

**Large change + cleanup prompts:** [`docs/TORQA_MAJOR_WORK_PROMPTS.md`](docs/TORQA_MAJOR_WORK_PROMPTS.md).

### Demo: üretilen siteyi localhost’ta çalıştır

Web konsol + terminal + masaüstü adımları: [`docs/DEMO_LOCALHOST.md`](docs/DEMO_LOCALHOST.md).

**Windows:** `torqa-console` PATH’te yoksa aynı işi proje kökünde şöyle başlatın: `python -m webui`.

---

## Documentation

**Hub:** [`docs/DOC_MAP.md`](docs/DOC_MAP.md) — grouped links (normative specs, roadmap, prompts, security, archive).

| Topic | Start here |
|-------|------------|
| Staged direction (EN) | [`ROADMAP.md`](ROADMAP.md) |
| Product phases + prompts (TR) | [`docs/TORQA_NIHAI_VISION_ROADMAP.md`](docs/TORQA_NIHAI_VISION_ROADMAP.md) |
| IR wire + semantics (normative) | [`docs/CORE_SPEC.md`](docs/CORE_SPEC.md), [`docs/FORMAL_CORE.md`](docs/FORMAL_CORE.md), [`spec/IR_BUNDLE.schema.json`](spec/IR_BUNDLE.schema.json) |
| Illustrative `.tq` | [`examples/torqa/auth_login.tq`](examples/torqa/auth_login.tq), [`examples/torqa/signin_flow.tq`](examples/torqa/signin_flow.tq) |
| Precursor “Kural v0” / old plans | [`docs/archive/precursor_and_plans/`](docs/archive/precursor_and_plans/) — **not** normative for current TORQA |

---

## Developer setup

Primary user flow: [Happy path (minimal workspace)](#happy-path-minimal-workspace) above.

### Install (full dev)

```bash
pip install -r requirements-dev.txt
pip install -e ".[dev]"
```

### Tests

```bash
python -m pytest
cargo test --manifest-path rust-core/Cargo.toml   # optional; requires Rust
```

### Web console

```bash
pip install -r requirements.txt
torqa-console
# or: python -m webui
```

Use `TORQA_WEB_HOST` / `TORQA_WEB_PORT` or CLI `--host` / `--port`. Docker: `docker compose up --build` → `http://127.0.0.1:8000`. The image sets OCI labels (`org.opencontainers.image.title=TORQA`, `version` aligned with `pyproject.toml`); `docker inspect` shows them.

### Other CLI examples

```bash
torqa demo
torqa guided examples/core/valid_minimal_flow.json --inputs-json "{\"username\":\"alice\"}"
torqa proposal-gate examples/core/valid_minimal_flow.json
```

Without `torqa` on PATH: `python -m src.cli.main <subcommand> …`.

---

## Security

See `docs/PROTOTYPE_SECURITY.md`. Treat AI suggestions and generated projections as **untrusted** until reviewed; do not expose the console to the public internet without hardening.

---

## Contributing

See `CONTRIBUTING.md`.

---

## License

Licensed under the [MIT License](LICENSE). You may replace the copyright line in `LICENSE` with your name or organization when you publish your fork.
