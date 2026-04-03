"""CLI: write ``reports/validation_gate.json`` from ``examples/validation_stress/manifest.json``."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from src.benchmarks.validation_gate_report import write_validation_gate_report


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="TORQA validation stress suite → JSON summary report.")
    p.add_argument("--repo-root", type=Path, default=Path.cwd())
    p.add_argument("--out", type=Path, default=None, help="Default: <repo-root>/reports/validation_gate.json")
    args = p.parse_args(argv)
    root = args.repo_root.resolve()
    out = args.out.resolve() if args.out else root / "reports" / "validation_gate.json"
    write_validation_gate_report(root, out)
    print(out)
    data = json.loads(out.read_text(encoding="utf-8"))
    s = data["summary"]
    ok = s["all_expectations_met"] and s["pipeline_guarantees"]["all_parse_stopped"] and s[
        "pipeline_guarantees"
    ]["all_validate_blocked_successful_project"]
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
