"""
P71: Launch the official TORQA Desktop (Electron + React under ``desktop/``).

Requires Node.js and a one-time ``npm install`` in ``desktop/``. If ``dist-electron/`` is
missing, runs ``npm run build`` automatically (slower first launch).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def main() -> int:
    desk = _repo_root() / "desktop"
    pkg = desk / "package.json"
    if not pkg.is_file():
        print("TORQA: missing desktop/package.json — Electron app not present.", file=sys.stderr)
        return 1
    if not (desk / "node_modules").is_dir():
        print("TORQA: run once from the repo root: cd desktop && npm install", file=sys.stderr)
        return 1
    main_js = desk / "dist-electron" / "main.js"
    if not main_js.is_file():
        print("TORQA: building desktop (npm run build in desktop/) …", file=sys.stderr)
        npm = "npm.cmd" if sys.platform == "win32" else "npm"
        b = subprocess.run([npm, "run", "build"], cwd=desk, check=False)
        if b.returncode != 0:
            return b.returncode
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    return int(subprocess.call([npm, "run", "start"], cwd=desk))


if __name__ == "__main__":
    raise SystemExit(main())
