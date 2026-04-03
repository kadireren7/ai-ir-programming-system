"""
Run the TORQA web server: ``python -m webui`` or ``torqa-console``.

Serves ``/`` (product site), ``/console`` (IR lab), ``/desktop`` (desktop webview shell), and JSON APIs.
"""

from __future__ import annotations

import argparse
import os


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="torqa-console",
        description="TORQA web: product site + /console IR lab + APIs (FastAPI + static).",
    )
    parser.add_argument(
        "--host",
        default=os.environ.get("TORQA_WEB_HOST", "127.0.0.1"),
        help="Bind address (default: 127.0.0.1 or TORQA_WEB_HOST).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("TORQA_WEB_PORT", "8000")),
        help="Port (default: 8000 or TORQA_WEB_PORT).",
    )
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable auto-reload (recommended in production).",
    )
    args = parser.parse_args()

    import uvicorn

    uvicorn.run(
        "webui.app:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
    )


if __name__ == "__main__":
    main()
