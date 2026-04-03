# TORQA website (official — P72)

**Single official product website** for the TORQA story (torqa.dev-style): hero, compression + gate narrative, demo links, get started, desktop CTA. **Not** the IR console (`/console`) or browser IDE (`/desktop`). Built output is served at **`GET /`** when you run `torqa-console`.

Semantic authority stays in **TORQA core**; this app only explains, links, and reads public APIs (e.g. benchmark report) for display.

## Build (updates `webui/static/site/`)

From this folder:

```bash
npm install
npm run build
```

Then run `torqa-console` (or `python -m webui`) and open **http://127.0.0.1:8000/**.

## Develop

```bash
npm run dev
```

Uses `/` as asset base (Vite dev). Production build uses `/static/site/` so assets resolve under the FastAPI static mount.

## Stack

React 18, TypeScript, Vite 5. **Not** an editor — content + links only; IR lab stays at `/console`.
