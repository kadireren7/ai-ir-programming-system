# UI surface rules (P36)

TORQA ships **two intentional user-facing surfaces** that share **brand** but **not** layout language. They must never collapse into one stretched UI.

## Website (`/` — torqa.dev-style product site)

**Purpose:** Product story, credibility, discoverability, proof (compression + validation gate), paths to docs and install, entry to the **browser console** and awareness of the **desktop app**.

**Must feel like:** A modern software **marketing / docs** site — spacious sections, clear hierarchy, hero + proof blocks, **not** an IDE and **not** a dense tool.

**Routes:** `GET /` serves `webui/static/site/index.html` (local preview). Production hostname target: **torqa.dev**.

**Source (P72):** Official site is the React + Vite app in [`website/`](../website/); run `npm run build` there to refresh `webui/static/site/` (served at `GET /`). See [P72_WEBSITE_OFFICIAL.md](P72_WEBSITE_OFFICIAL.md).

**Theme:** Dark and light modes; default follows **`prefers-color-scheme`** until the user toggles (stored in `localStorage`).

## Official native desktop (`torqa-desktop` → `desktop/` Electron)

**Purpose:** **Authoring** over `.tq` — folder picker, editor, **Validate** / **Build** / **Benchmark** via **`torqa` CLI** subprocesses only.

**Source:** [`desktop/`](../desktop/) (Vite + Electron). **Not** the marketing site and **not** the IR lab.

## Browser desktop route (`GET /desktop`)

**Purpose:** **Authoring in the browser** when `torqa-console` is running — embedded **web** IDE (Monaco, APIs).

**Must feel like:** A **code editor / IDE** — explorer, editor, Output/Diagnostics, tooling for benchmark + gate. **Not** a landing page.

**Theme:** **Dark-first**; **light mode** via `localStorage`.

## Legacy Python desktop (`desktop_legacy/`)

**Purpose:** Tk or pywebview fallback; IR JSON workflow + `workspace_io`. See [`desktop_legacy/README.md`](../desktop_legacy/README.md) and [`P71_DESKTOP_OFFICIAL.md`](P71_DESKTOP_OFFICIAL.md).

## Web console (`/console`)

**Purpose:** Full **IR lab** in the browser (Monaco, examples, pipeline, ZIP). This is **not** the public homepage; it is the **developer console** linked from the site.

**Theme:** Dark default; light mode toggle with `localStorage`.

## Shared brand traits

- **Logo mark:** `TQ` gradient tile (blue → indigo).
- **Typography:** Inter + JetBrains Mono for code.
- **Accent:** Blue primary (`--tq-brand` in `webui/static/shared/torqa-tokens.css`).
- **Semantic colors:** green OK / red error (adjusted per theme).

## Intentional differences

| Dimension | Website | Desktop |
|----------|---------|---------|
| Density | Airy, sectioned | Compact, panel-based |
| Primary job | Understand + trust + navigate | Edit + build + inspect |
| Navigation | Anchor sections + CTAs | Explorer + tabs + panels |
| Proof blocks | Narrative + links to CLI paths | Tooling pre blocks + chip status |

## Demo readiness (both)

- **Flagship**, **compression**, and **gate** appear on the **website** as **product proof** (copy + commands).
- On **desktop**, the same stories appear as **workflow tooling** (preformatted metrics + gate summary + flagship load).

## Files (reference)

| Surface | HTML | Styles |
|---------|------|--------|
| Website | `webui/static/site/index.html` | `webui/static/site/site.css` |
| Web console | `webui/static/console/index.html` | `webui/static/styles.css` |
| Desktop (webview) | `webui/static/desktop/index.html` | `webui/static/desktop/desktop.css` |
| Tokens | — | `webui/static/shared/torqa-tokens.css` |

See also: [DEMO_SURFACES.md](DEMO_SURFACES.md), [FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md).
