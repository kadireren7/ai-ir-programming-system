"""
TORQA Desktop: Cursor-style window, folder picker, prompt → IR → write project folder.

Run: ``python -m desktop`` or ``torqa-desktop`` (``pip install -e .``).
Embedded browser (optional): ``pip install -e ".[desktop-webview]"`` — may fail on Windows
if ``pythonnet`` cannot build; then use ``python -m desktop --tk``.

**Paths:** On Windows, ``filedialog`` returns drive paths like ``C:/Users/...``; materialize
resolves with ``Path.resolve()`` and writes under ``generated_out`` (see ``docs/TORQA_NIHAI_VISION_ROADMAP.md`` F3.2).
"""

from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]


def _find_free_port() -> int:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def _wait_health(port: int, timeout_sec: float = 15.0) -> bool:
    url = f"http://127.0.0.1:{port}/api/health"
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=0.5) as r:
                if r.status == 200:
                    return True
        except (urllib.error.URLError, OSError):
            time.sleep(0.08)
    return False


def _run_uvicorn(port: int) -> None:
    import uvicorn

    config = uvicorn.Config(
        "webui.app:app",
        host="127.0.0.1",
        port=port,
        log_level="warning",
    )
    uvicorn.Server(config).run()


class DesktopApi:
    """Methods callable from JS via pywebview ``window.pywebview.api.*``."""

    def select_workspace_folder(self) -> Optional[str]:
        try:
            import webview

            win = webview.windows[0]
            result = win.create_file_dialog(webview.FOLDER_DIALOG)
            if result and len(result) > 0:
                return str(Path(result[0]).resolve())
        except Exception:
            pass
        return None

    def write_flow_project(self, workspace: str, ir_bundle_json: str) -> Dict[str, Any]:
        from desktop.workspace_io import write_flow_project_json_str

        return write_flow_project_json_str(workspace, ir_bundle_json)

    def materialize_project(self, workspace: str, ir_bundle_json: str) -> Dict[str, Any]:
        """Validate IR and write projection tree under ``<workspace>/generated_out`` (``torqa project``)."""
        from desktop.workspace_io import materialize_bundle_json_str

        return materialize_bundle_json_str(workspace, ir_bundle_json, engine_mode="python_only")


def _run_pywebview_desktop() -> None:
    import webview

    port = _find_free_port()
    thread = threading.Thread(target=_run_uvicorn, args=(port,), daemon=True)
    thread.start()
    if not _wait_health(port):
        raise RuntimeError("Yerel sunucu başlamadı.")

    url = f"http://127.0.0.1:{port}/desktop"
    api = DesktopApi()
    webview.create_window(
        "TORQA Desktop",
        url,
        width=1100,
        height=720,
        min_size=(880, 560),
        js_api=api,
    )
    webview.start(debug=False)


def main() -> None:
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="TORQA masaüstü kabuğu.")
    parser.add_argument(
        "--tk",
        action="store_true",
        help="pywebview yerine Tkinter kullan (Python 3.14 / pythonnet sorunlarında).",
    )
    args = parser.parse_args()

    if args.tk:
        from desktop.tk_shell import run_tk_desktop

        run_tk_desktop()
        return

    try:
        import webview  # noqa: F401
    except ImportError as ex:
        print(
            "pywebview yok; Tkinter moduna geçiliyor. Kurulum: pip install -e .  "
            'İsteğe bağlı gömülü tarayıcı: pip install -e ".[desktop-webview]" '
            "(Windows'ta pythonnet derlemesi sık başarısız; o zaman --tk kullanın.)",
            file=sys.stderr,
        )
        from desktop.tk_shell import run_tk_desktop

        run_tk_desktop()
        return

    try:
        _run_pywebview_desktop()
    except Exception as ex:
        print(f"pywebview başlatılamadı ({ex}); Tkinter modu kullanılıyor.", file=sys.stderr)
        from desktop.tk_shell import run_tk_desktop

        run_tk_desktop()


if __name__ == "__main__":
    main()
