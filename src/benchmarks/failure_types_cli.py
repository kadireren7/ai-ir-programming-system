"""CLI: ``reports/failure_types.json`` — syntax / structure / semantic buckets."""

from __future__ import annotations

import argparse
from pathlib import Path

from src.benchmarks.failure_types_report import write_failure_types_report


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Classify TORQA failures into syntax / structure / semantic.")
    p.add_argument("--repo-root", type=Path, default=Path.cwd())
    p.add_argument("--out", type=Path, default=None, help="Default: <repo-root>/reports/failure_types.json")
    args = p.parse_args(argv)
    root = args.repo_root.resolve()
    out = args.out.resolve() if args.out else root / "reports" / "failure_types.json"
    write_failure_types_report(root, out)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
