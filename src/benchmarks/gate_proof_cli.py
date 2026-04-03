"""
CLI: run P33 gate-proof manifest and print a JSON report (accepted vs rejected by stage).

Exit code 0 when every case matches ``expect_accepted`` / ``reject_at``; otherwise 1.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from src.benchmarks.gate_proof import gate_proof_report_to_json, run_gate_proof_manifest


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="TORQA P33 validation gate proof (manifest-driven).")
    p.add_argument(
        "--manifest",
        type=Path,
        default=Path("examples/benchmark_flagship/gate_invalid/manifest.json"),
        help="Path to manifest.json listing cases (default: flagship gate_invalid set).",
    )
    p.add_argument(
        "--no-project",
        action="store_true",
        help="Stop after validate (do not run materialize / project stage).",
    )
    args = p.parse_args(argv)
    manifest = args.manifest.resolve()
    report = run_gate_proof_manifest(manifest, run_project=not args.no_project)
    sys.stdout.write(gate_proof_report_to_json(report))
    return 0 if report["summary"]["mismatch_with_expectation"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
