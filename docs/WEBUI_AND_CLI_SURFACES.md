# Web UI and CLI surfaces

## Web (`website/server/app.py`)

Run locally: `torqa-console`, `python -m website.server`, or `uvicorn website.server.app:app`. Flagship demo path: `torqa demo` ([`docs/FLAGSHIP_DEMO.md`](FLAGSHIP_DEMO.md)). **`GET /`** = marketing website ([`website/`](../website/)) · **`GET /console`** → **`/`** · **`GET /desktop`** = desktop pointer ([`docs/P73_PRODUCT_SURFACES.md`](P73_PRODUCT_SURFACES.md), [`docs/UI_SURFACE_RULES.md`](UI_SURFACE_RULES.md)).

| Page | Purpose |
|------|---------|
| `GET /` | **Official** marketing site — source [`website/`](../website/), build output `website/dist/site/` |
| `GET /console` | Permanent redirect to `/` |
| `GET /desktop` | Native desktop pointer (`website/static/desktop/index.html`) |

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Liveness + `canonical_ir_version`, `package_version` |
| `GET /api/demo/flagship-tq` | P34: `examples/benchmark_flagship/app.tq` source for demo UIs |
| `GET /api/demo/benchmark-report` | P32: `compression_baseline_report.json` payload |
| `GET /api/demo/gate-proof-report` | P33: manifest-driven gate summary JSON |
| `POST /api/run` | Full pipeline + orchestrator + `execution_trace` (enriched plan + result) |
| `POST /api/diagnostics` | `build_full_diagnostic_report` |
| `POST /api/quality` | `build_ir_quality_report` |
| `POST /api/explain` | `explain_ir_goal` |
| `POST /api/strategy` | `explain_projection_strategy` |
| `POST /api/preview-patch` | `build_patch_preview_report` (also **Patch preview** tab in the console) |
| `POST /api/system-health` | `build_system_health_report` |
| `POST /api/ir/patch` | Apply mutations |
| `POST /api/ai/suggest` | LLM proposal (validated; default `max_retries` 3) |

## CLI (`torqa` · `python -m torqa` · `python -m src.cli.main`)

One entrypoint. **Global `--json`** (machine-readable stdout): place it **before** the subcommand — e.g. `torqa --json surface FILE.tq`. The form `torqa surface FILE.tq --json` is invalid.

| Command | Purpose |
|---------|---------|
| `build` | **Primary:** validate + materialize from `.tq` / IR `.json` / `.pxir` → `--out` under `--root` (default `generated_out`) |
| `project` | Same pipeline as `build`; use optional `--source` if you omit the positional file |
| `surface` | Compile `.tq` or `.pxir` to IR bundle JSON (stdout; optional `--out` path) |
| `validate` / `diagnostics` | Full diagnostic report for an **IR bundle `.json` file only** (not `.tq`) |
| `explain` | IR introspection (JSON bundle file) |
| `quality` | Quality metrics |
| `strategy` | Projection explanation |
| `run` | Engine + orchestrator run (JSON payload shape aligned with `POST /api/run`) |
| `demo` | No subcommand: print flagship first-trial command index. `demo verify` = CI sanity. `demo emit` = materialize default multi-surface demo bundle to `--out` |
| `patch` / `preview-patch` | Apply / preview mutations |
| `check` | System health + checkpoints (exit `3` if any checkpoint fails) |
| `ai-suggest` | LLM path |
| `guided` | Diagnostics then full pipeline JSON (same shape as `POST /api/run`) |
| `bundle-lint` / `language` / `migrate` / … | See `torqa --help` |
