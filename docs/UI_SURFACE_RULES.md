# UI surface rules (P36 + P73)

TORQA ships **distinct** surfaces that share **brand** but **not** layout language. After **P73** there is **one** official product website, **one** official native desktop, and **no** legacy Python UI.

## Website (`/` — product site)

**Purpose:** Product story, credibility, discoverability, proof (compression + validation gate), and **native desktop** entry — **no** browser IR lab (`/console` redirects to `/`); developer detail lives in the repo + CLI.

**Must feel like:** A modern **marketing / docs** site — clear hierarchy, hero + proof blocks, **not** an IDE and **not** internal command dumps on the homepage.

**Routes:** `GET /` serves `website/dist/site/index.html`. **Source:** [`website/`](../website/) — `npm run build` → `website/dist/site/`. FastAPI lives in [`website/server/`](../website/server/). See [P72_WEBSITE_OFFICIAL.md](P72_WEBSITE_OFFICIAL.md), [P73_PRODUCT_SURFACES.md](P73_PRODUCT_SURFACES.md).

**Theme:** Dark and light; default follows **`prefers-color-scheme`** until the user toggles (`localStorage`).

## Official native desktop (`torqa-desktop` → `desktop/` Electron)

**Purpose:** **Authoring** over `.tq` — folder picker, editor, **Validate** / **Build** / **Benchmark** via **`torqa` CLI** subprocesses only.

**Source:** [`desktop/`](../desktop/) (Vite + Electron). **Not** the marketing site and **not** the IR lab.

## `GET /desktop` (native app pointer — P73)

**Purpose:** Short static page that points users to **`torqa-desktop`** and back to **`/`**. **Not** a second IDE.

## `GET /console` (removed)

**Purpose:** **301 redirect to `/`.** The browser IR lab was retired so the web surface is **marketing-only**; use **CLI** and **TORQA Desktop** for tooling.

## Shared brand traits

- **Logo mark:** `TQ` gradient tile (blue → indigo).
- **Typography:** Product site uses Plus Jakarta Sans (+ DM Sans fallback); optional `benchmark_panel.js` in `website/static/shared/`.
- **Accent:** Blue primary.
- **Semantic colors:** green OK / red error (per theme).

## Intentional differences

| Dimension | Website | Native desktop |
|----------|---------|----------------|
| Density | Airy, sectioned | Compact, panel-based |
| Primary job | Understand + trust + navigate | Edit + build + inspect |
| Navigation | Anchor sections + CTAs | Explorer + tabs + panels |
| Proof blocks | Narrative + optional live benchmark API | Tooling output + diagnostics |

## Files (reference)

| Surface | HTML | Notes |
|---------|------|--------|
| Website | `website/dist/site/index.html` | Vite build from `website/` |
| `/console` | — | Redirect to `/` |
| `/desktop` | `website/static/desktop/index.html` | Pointer page |
| Shared | `website/static/shared/` | `benchmark_panel.js`, tokens |

**Core helpers:** `src/workspace_bundle_io.py` — materialize / flow scaffold (tests + tooling; not a UI).

See also: [DEMO_SURFACES.md](DEMO_SURFACES.md), [FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md), [P73_PRODUCT_SURFACES.md](P73_PRODUCT_SURFACES.md).
