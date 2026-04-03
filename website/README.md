# TORQA website (official — P72)

**Official marketing website** — premium positioning copy only (no command cheatsheets on the page). Built output is served at **`GET /`** when you run `torqa-console`. **`/console`** redirects to **`/`** (browser IR lab removed). **`/desktop`** is a short pointer page ([P73](../docs/P73_PRODUCT_SURFACES.md)).

Semantic authority stays in **TORQA core**; this app only explains, links, and reads public APIs (e.g. benchmark report) for display.

## Build (writes `dist/site/`)

From this folder:

```bash
npm install
npm run build
```

Then run `torqa-console` (or `python -m website.server`) and open **http://127.0.0.1:8000/**.

## Develop

```bash
npm run dev
```

Uses `/` as asset base (Vite dev). Production build uses `/static/site/` so assets resolve under the FastAPI static mount.

## Stack

React 18, TypeScript, Vite 5. **Not** an editor — marketing narrative + optional live benchmark API only.
