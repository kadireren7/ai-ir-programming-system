# P73 — One official website, one official desktop

## Decision table

| Path | Role | P73 action | Reason |
|------|------|------------|--------|
| **`website/`** (Vite → `dist/site/`) | Official product site at **`GET /`** | **Keep** | Marketing UI; TS React, no semantics. |
| **`website/server/`** (FastAPI) | Host: static mounts + JSON APIs | **Keep** | Same package tree as the site source. |
| **`/console`** | Was browser IR lab | **Removed** | **301 → `/`** — marketing site only; use CLI + desktop. |
| **`website/static/desktop/index.html`** | **`GET /desktop`** | **Pointer** | Native-desktop CTA (no in-browser IDE). |
| **`desktop/`** (Electron + React) | Official **TORQA Desktop** (`torqa-desktop`) | **Keep** + UX hardening | Only native authoring shell; calls `torqa` CLI. |
| **`desktop_legacy/`** (Python Tk / pywebview) | Legacy UI | **Removed** | TS desktop + `src/workspace_bundle_io.py` cover materialize helpers; no competing Python UI. |

## Rules

- **Core** (`src/`, CLI) owns validation, IR, build, benchmarks.
- **Website** explains and links; may consume read-only APIs for benchmark display.
- **Desktop** is a shell only; no duplicated validation semantics.
- **`/desktop`** URL does not host a full IDE; use **`torqa-desktop`** for that.

## Related

- [P72_WEBSITE_OFFICIAL.md](P72_WEBSITE_OFFICIAL.md) — website vs host (note: `/desktop` role updated in P73)
- [UI_SURFACE_RULES.md](UI_SURFACE_RULES.md)
- [desktop/README.md](../desktop/README.md)
