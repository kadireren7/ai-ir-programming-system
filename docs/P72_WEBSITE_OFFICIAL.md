# P72 — Official website surface (role split)

**Rules:** The **website** is product/docs/demo entry only. It is **not** the semantic authority. Validation and IR semantics live in **TORQA core** (CLI, libraries). The site may **display** benchmark/gate/demo data from APIs or static fixtures; it does **not** implement validation rules.

## Audit: web-facing surfaces

| Path / artifact | Current role | Overlaps “official product website”? | Verdict |
|-----------------|--------------|----------------------------------------|---------|
| **`GET /`** → `webui/static/site/*` (built from [`website/`](../website/)) | **Product homepage** — hero, problems, compression, gate, demo, benchmark UI, get started, desktop CTA, dark/light | **Yes — this is the website** | **Keep as official website** |
| **`GET /console`** → `webui/static/console/*` | **IR lab** — Monaco, diagnostics, pipeline, examples | No (developer tool) | **Separate** — playground / console |
| **`GET /desktop`** → `webui/static/desktop/*` | **Browser IDE shell** — explorer, editor, materialize | No (authoring UI) | **Separate** |
| **`webui/app.py`** + `/api/*` | **Backend** for console, desktop, benchmark JSON, health | No (not a page) | **Keep** — required host |
| **`webui/static/styles.css`**, **`app.js`** | Shared assets for **`/console`** (not `/`) | No | **Keep** — console styling/JS |
| **`webui/static/shared/*`** | Shared panels (benchmark render helper) used by console/desktop/site | Partial (site may load `benchmark_panel.js` for CI markers) | **Keep** — shared widgets |

There is **no second maintained marketing-site source** in the repo: the former hand-written homepage was replaced by the TypeScript app (P70). **`webui/`** is the **server and app shell**, not a duplicate “old website.”

## Required responsibilities checklist (TS website)

| # | Requirement | Met by `website/` → `/` |
|---|-------------|-------------------------|
| 1 | Clear hero | Yes |
| 2 | Explains TORQA quickly | Yes |
| 3 | Semantic compression story | Yes (+ live benchmark fetch when API available) |
| 4 | Validation gate story | Yes (copy + doc links) |
| 5 | Flagship / demo entry | Yes (`torqa demo`, links) |
| 6 | Docs / get started | Yes |
| 7 | Desktop CTA | Yes |
| 8 | Dark / light | Yes |
| 9 | Serious product look | Yes (dedicated design system in `website/src`) |
| 10 | Not an editor | Yes (links to `/console`; no Monaco on `/`) |

## Decision

- **Official website source:** [`website/`](../website/) (TypeScript + React + Vite).  
- **Build output:** `npm run build` → `webui/static/site/` → served at **`/`** by `torqa-console`.  
- **`webui/`** remains the **host** for `/`, `/console`, `/desktop`, and APIs — **not** retired; its role is **infrastructure + non-website surfaces**.

## See also

- [UI_SURFACE_RULES.md](UI_SURFACE_RULES.md) — `/` vs `/console` vs `/desktop`
- [DEMO_SURFACES.md](DEMO_SURFACES.md) — what to show where
- [website/README.md](../website/README.md) — build & dev
