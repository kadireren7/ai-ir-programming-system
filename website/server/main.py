"""CLI entry for ``torqa-console`` / ``python -m website.server``."""

from __future__ import annotations

import argparse
import os


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="torqa-console",
        description="TORQA: marketing site + APIs (FastAPI). /console redirects to /.",
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
        "website.server.app:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
    )


if __name__ == "__main__":
    main()
