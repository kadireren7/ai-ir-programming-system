# Web UI and CLI surfaces

## Web (`webui/app.py`)

Run locally: `TORQA-console`, `python -m webui`, or `uvicorn webui.app:app`.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Liveness + `canonical_ir_version`, `package_version` |
| `POST /api/run` | Full pipeline + orchestrator + `execution_trace` (enriched plan + result) |
| `POST /api/diagnostics` | `build_full_diagnostic_report` |
| `POST /api/quality` | `build_ir_quality_report` |
| `POST /api/explain` | `explain_ir_goal` |
| `POST /api/strategy` | `explain_projection_strategy` |
| `POST /api/preview-patch` | `build_patch_preview_report` (also **Patch preview** tab in the console) |
| `POST /api/system-health` | `build_system_health_report` |
| `POST /api/ir/patch` | Apply mutations |
| `POST /api/ai/suggest` | LLM proposal (validated; default `max_retries` 3) |

## CLI (`python -m src.cli.main`)

Global: `--json` (compact JSON, place **before** subcommand).

| Command | Purpose |
|---------|---------|
| `validate` / `diagnostics` | Full diagnostics |
| `explain` | IR introspection |
| `quality` | Quality metrics |
| `strategy` | Projection explanation |
| `run` / `project` | Engine / write artifacts |
| `patch` / `preview-patch` | Apply / preview mutations |
| `check` | System health + checkpoints (exit `3` if any checkpoint fails) |
| `ai-suggest` | LLM path |
| `guided` | Diagnostics then full pipeline JSON (same shape as `POST /api/run`) |
| `demo` | Validate then write **all** projection surfaces (webapp + SQL + stubs) under `--out` |
