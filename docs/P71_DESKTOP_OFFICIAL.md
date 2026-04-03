# P71 — Official desktop surface (replacement decision)

> **P73:** **`desktop_legacy/`** and **`torqa-desktop-legacy`** are **removed**. **`GET /desktop`** is a **native-desktop CTA** only. Materialize helpers live in **`src/workspace_bundle_io.py`**. See [P73_PRODUCT_SURFACES.md](P73_PRODUCT_SURFACES.md).

**Rule:** TORQA core (`torqa` CLI / APIs) owns validation and IR. Desktop code is **only** a surface.

## Gap audit (Python legacy vs TypeScript Electron)

| # | Responsibility | `desktop_legacy/` (Tk / pywebview) | `desktop/` (Electron) | Replacement-ready |
|---|------------------|-------------------------------------|-------------------------|-------------------|
| 1 | Open / select project folder | Yes | Yes | Yes |
| 2 | Open & edit `.tq` | Tk: IR JSON focus; limited `.tq` | Yes (`.tq` tree + editor) | Yes |
| 3 | Run validate | Yes (IR JSON `validate_stage`) | Yes (`torqa --json surface`) | Yes |
| 4 | Run build / project | Yes (`materialize_bundle_to_workspace`) | Yes (`torqa --json build`) | Yes |
| 5 | Show validation results clearly | Yes (diagnostics panel) | Yes (PASS/FAIL + JSON) | Yes |
| 6 | Pipeline stage visibility | Partial (Tk build text) | Yes (`pipeline_stages` from CLI JSON) | Yes |
| 7 | Show generated output paths | Yes | Yes (`written` list) | Yes |
| 8 | Benchmark summary | Yes (read fixture / P32 line) | Yes (`torqa --json demo benchmark`) | Yes |
| 9 | Sample / demo entry | Yes (sample + quick demo) | Yes (P71: copy minimal/flagship `.tq` + quick demo) | Yes |
| 10 | Dark / light theme | Tk: dark-only styling; webview uses `/desktop` theme | Yes | Yes |
| 11 | Editor-like feel | Mixed (Tk prototype; webview = browser IDE) | Yes | Yes |

## Decision (current)

**The Electron app under `desktop/` is the only official native desktop**, launched by **`torqa-desktop`** (`src/torqa_desktop_launcher.py`).

**`GET /desktop`** on `torqa-console` serves a **short CTA page** for that app (not a browser IDE).

## What was not done

- No TORQA core rewrites.
- No validation logic duplicated in the Electron renderer (subprocess `python -m torqa` only).

## See also

- [`desktop/README.md`](../desktop/README.md) — official app build/run
- [P73_PRODUCT_SURFACES.md](P73_PRODUCT_SURFACES.md) — surface consolidation
- [`docs/DEMO_SURFACES.md`](DEMO_SURFACES.md), [`docs/UI_SURFACE_RULES.md`](UI_SURFACE_RULES.md)
