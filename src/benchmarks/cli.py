"""CLI entry for ``torqa-compression-bench`` (P32)."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="TORQA P32 compression benchmark (token estimates).")
    parser.add_argument(
        "benchmark_dir",
        type=Path,
        help="Directory with BENCHMARK_TASK.md, app.tq, expected_output_summary.json",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=None,
        help="Repository root (for relative paths in report; default: cwd)",
    )
    parser.add_argument(
        "--materialize-root",
        type=Path,
        default=None,
        help="Existing materialize output root (contains generated/webapp/...).",
    )
    parser.add_argument(
        "--no-generated",
        action="store_true",
        help="Do not measure generated webapp.",
    )
    parser.add_argument(
        "--write",
        type=Path,
        default=None,
        help="Write public JSON report to this path.",
    )
    parser.add_argument(
        "--keep-temp",
        action="store_true",
        help="Keep temp dir when auto-materializing.",
    )
    args = parser.parse_args(argv)

    repo_root = args.repo_root.resolve() if args.repo_root else Path.cwd().resolve()

    from src.benchmarks.compression_report import (
        benchmark_report_to_canonical_json,
        public_benchmark_report,
        run_compression_benchmark,
    )

    ephemeral: str | None = None
    try:
        if args.no_generated:
            report = run_compression_benchmark(args.benchmark_dir, repo_root=repo_root)
        elif args.materialize_root is not None:
            report = run_compression_benchmark(
                args.benchmark_dir,
                repo_root=repo_root,
                materialize_root=args.materialize_root.resolve(),
            )
        else:
            report = run_compression_benchmark(
                args.benchmark_dir,
                repo_root=repo_root,
                auto_materialize=True,
            )
        ephemeral = report.get("_ephemeral_materialize_root")
        public = public_benchmark_report(report)
        print(json.dumps(public, indent=2, ensure_ascii=False, sort_keys=True))
        if args.write:
            args.write.parent.mkdir(parents=True, exist_ok=True)
            args.write.write_text(benchmark_report_to_canonical_json(report), encoding="utf-8")
    finally:
        if ephemeral and not args.keep_temp:
            shutil.rmtree(ephemeral, ignore_errors=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
