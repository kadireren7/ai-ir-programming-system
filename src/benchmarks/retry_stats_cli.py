"""CLI: ``reports/retry_stats.json`` — AI suggestion retry stats per benchmark task."""

from __future__ import annotations

import argparse
from pathlib import Path

from src.benchmarks.retry_stats_report import write_retry_stats_report


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Measure AI IR suggest retries per examples/benchmarks task (requires OPENAI_API_KEY for --live)."
    )
    p.add_argument("--repo-root", type=Path, default=Path.cwd())
    p.add_argument("--out", type=Path, default=None, help="Default: <repo-root>/reports/retry_stats.json")
    p.add_argument(
        "--live",
        action="store_true",
        help="Call OpenAI (needs OPENAI_API_KEY); otherwise write deterministic skip report.",
    )
    p.add_argument("--max-retries", type=int, default=3, help="Passed to suggest_ir_bundle_from_prompt")
    args = p.parse_args(argv)
    root = args.repo_root.resolve()
    out = args.out.resolve() if args.out else root / "reports" / "retry_stats.json"
    write_retry_stats_report(root, out, max_retries=args.max_retries, live=args.live)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
