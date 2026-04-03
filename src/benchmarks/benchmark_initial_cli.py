"""CLI: write ``reports/benchmark_initial.json``."""

from __future__ import annotations

import argparse
from pathlib import Path

from src.benchmarks.benchmark_initial import write_benchmark_initial_report


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="TORQA initial benchmark comparison (TASK.md + app.tq vs simulated raw size).")
    p.add_argument(
        "--repo-root",
        type=Path,
        default=Path.cwd(),
        help="Repository root (default: cwd)",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output JSON path (default: <repo-root>/reports/benchmark_initial.json)",
    )
    args = p.parse_args(argv)
    root = args.repo_root.resolve()
    out = args.out.resolve() if args.out else root / "reports" / "benchmark_initial.json"
    write_benchmark_initial_report(root, out)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
