"""CLI: write ``reports/token_proof.json`` and ``docs/TOKEN_PROOF.md`` (P75)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from src.benchmarks.token_proof import build_token_proof_report, render_token_proof_markdown, report_to_canonical_json


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="P75 token proof report (deterministic JSON + markdown).")
    p.add_argument(
        "--repo-root",
        type=Path,
        default=None,
        help="Repository root (default: parent of src/)",
    )
    p.add_argument(
        "--json-out",
        type=Path,
        default=None,
        help="Output JSON path (default: <repo>/reports/token_proof.json)",
    )
    p.add_argument(
        "--md-out",
        type=Path,
        default=None,
        help="Output markdown path (default: <repo>/docs/TOKEN_PROOF.md)",
    )
    args = p.parse_args(argv)

    repo = args.repo_root.resolve() if args.repo_root else Path(__file__).resolve().parents[2]
    json_out = args.json_out or (repo / "reports" / "token_proof.json")
    md_out = args.md_out or (repo / "docs" / "TOKEN_PROOF.md")

    report = build_token_proof_report(repo)
    json_out.parent.mkdir(parents=True, exist_ok=True)
    md_out.parent.mkdir(parents=True, exist_ok=True)
    json_out.write_text(report_to_canonical_json(report), encoding="utf-8")
    md_out.write_text(render_token_proof_markdown(report), encoding="utf-8")

    if report.get("summary", {}).get("failed_count"):
        print(
            f"token-proof: {report['summary']['failed_count']} scenario(s) failed — see {json_out}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
