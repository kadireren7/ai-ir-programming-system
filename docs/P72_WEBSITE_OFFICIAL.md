# P72 — Official website surface (role split)

**Rules:** The **website** is product/docs/demo entry only. It is **not** the semantic authority. Validation and IR semantics live in **TORQA core** (CLI, libraries). The site may **display** benchmark/gate/demo data from APIs or static fixtures; it does **not** implement validation rules.

## Audit: web-facing surfaces

| Path / artifact | Current role | Overlaps “official product website”? | Verdict |
|-----------------|--------------|----------------------------------------|---------|
| **`GET /`** → `website/dist/site/*` (Vite build from [`website/`](../website/)) | **Product homepage** — hero, problems, compression, gate, demo, benchmark UI, get started, desktop CTA, dark/light | **Yes — this is the website** | **Keep as official website** |
| **`GET /console`** | **301 → `/`** (browser IR lab removed) | No | **Retired** |
| **`GET /desktop`** → `website/static/desktop/*` | **P73:** Native-desktop **pointer** | No | **Separate** — see [P73_PRODUCT_SURFACES.md](P73_PRODUCT_SURFACES.md) |
| **`website/server/app.py`** + `/api/*` | **Backend** for site, benchmark JSON, health | No (not a page) | **Keep** — required host |
| **`website/static/shared/*`** | `benchmark_panel.js` etc. for CI markers / optional hooks | Partial | **Keep** where referenced |

There is **no second maintained marketing-site source**: the TypeScript app (P70+) and the FastAPI host live together under [`website/`](../website/).

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
| 10 | Not an editor | Yes (marketing-only; no in-browser lab) |

## Decision

- **Official website source:** [`website/`](../website/) (TypeScript + React + Vite).  
- **Build output:** `npm run build` → `website/dist/site/` → served at **`/`** by `torqa-console`.  
- **`website/server/`** hosts `/`, `/desktop`, APIs, and **`/console` → `/` redirect**. **`/desktop`** static file is under **P73** (pointer page).

## See also

- [UI_SURFACE_RULES.md](UI_SURFACE_RULES.md) — `/` vs `/desktop` vs `/console` redirect
- [DEMO_SURFACES.md](DEMO_SURFACES.md) — what to show where
- [website/README.md](../website/README.md) — build & dev
