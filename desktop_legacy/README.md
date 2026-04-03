# Desktop legacy (Python / Tk / pywebview)

**Status:** **Legacy / fallback only** (P71). Prefer the official native app:

- **`torqa-desktop`** — launches Electron under [`../desktop/`](../desktop/) (TypeScript shell over `torqa` CLI).

This package remains for:

- **Tk** workflow (IR JSON editor, AI suggest, flagship buttons) when you cannot use Node/Electron.
- **pywebview** loading **`/desktop`** from a local `torqa-console` instance (embedded **browser** IDE, not the Electron shell).

## Commands

```bash
python -m desktop_legacy --tk
torqa-desktop-legacy --tk
```

See [`docs/P71_DESKTOP_OFFICIAL.md`](../docs/P71_DESKTOP_OFFICIAL.md) and [`docs/FAILURE_MODES.md`](../docs/FAILURE_MODES.md).
