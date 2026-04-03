# TORQA Desktop (official — P69 / P71)

Native **Electron + React** shell for `.tq` projects. **All validation, IR, build, and benchmark logic runs in TORQA core** via `python -m torqa` subprocesses from the main process. This folder is **UI + IPC only**.

## Prerequisites

1. **TORQA repo** with `pip install -e .` (repository root).
2. **Node.js 20+** and npm.
3. This folder lives next to `src/`, `pyproject.toml`, etc. If you move only this tree, set **`TORQA_REPO_ROOT`** to the repo root.
4. **Python** on `PATH` (`python` / `python3`) or **`TORQA_PYTHON`**.

## Install & run

```bash
cd desktop
npm install
npm run dev          # development (Vite + Electron)
```

**From the repo root (after `npm install` in `desktop/` once):**

```bash
torqa-desktop
```

The launcher (`src/torqa_desktop_launcher.py`) will run `npm run build` in `desktop/` if `dist-electron/` is missing.

Production-style:

```bash
cd desktop
npm run build
npm start
```

## First-run samples

With a folder open: **Quick demo (sample + validate)**, **Load minimal sample**, or **Load flagship sample** — copies repo examples into `<workspace>/torqa_samples/` and opens the `.tq` file (core-only checks).

## Legacy fallback

Python Tk / pywebview: **`torqa-desktop-legacy`** or **`python -m desktop_legacy --tk`** — see [`../desktop_legacy/README.md`](../desktop_legacy/README.md).

## Security

Open **trusted** folders only. The main process restricts file IO to the selected workspace (path checks).
