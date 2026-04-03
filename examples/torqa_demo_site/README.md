# TORQA demo site (flagship `.tq` → generated webapp)

This folder is the **end-to-end website demo** source: one `.tq` file that compiles to IR, materializes a Vite + React app under `generated/webapp/`, and other projection stubs.

**Step-by-step:** [`docs/FIRST_REAL_DEMO.md`](../../docs/FIRST_REAL_DEMO.md)

Quick build (from repo root, after `pip install -e .`):

```bash
torqa build examples/torqa_demo_site/app.tq
```

Then run the generated UI (see the walkthrough for `npm install` / `npm run dev`).
