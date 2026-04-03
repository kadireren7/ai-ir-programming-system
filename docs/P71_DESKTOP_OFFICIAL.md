# P71 — Official desktop surface (replacement decision)

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

## Decision

**The Electron app under `desktop/` is the single official native desktop** launched by **`torqa-desktop`** (`src/torqa_desktop_launcher.py`).

**`desktop_legacy/`** remains as **legacy / fallback** only:

- **`torqa-desktop-legacy`** / **`python -m desktop_legacy`** — Tk or pywebview + `workspace_io` (no Node).

**`GET /desktop`** on `torqa-console` is unchanged: it is the **browser-hosted IDE shell**, not the Electron app. Naming: “desktop” route vs “Desktop app” in docs means: native = Electron; browser IDE = `/desktop`.

## What was not done

- No TORQA core rewrites.
- No validation logic duplicated in the Electron renderer (subprocess `python -m torqa` only).

## See also

- [`desktop/README.md`](../desktop/README.md) — official app build/run
- [`desktop_legacy/README.md`](../desktop_legacy/README.md) — legacy commands
- [`docs/DEMO_SURFACES.md`](DEMO_SURFACES.md), [`docs/UI_SURFACE_RULES.md`](UI_SURFACE_RULES.md)
