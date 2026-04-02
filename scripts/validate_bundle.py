#!/usr/bin/env python3
"""
Run full diagnostics on an IR bundle JSON (same checks as ``torqa validate``).

Example::

    python scripts/validate_bundle.py examples/core/valid_minimal_flow.json

Exit code 0 if diagnostics report ``ok`` is true; otherwise 1.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(repo))

    p = argparse.ArgumentParser(description="Validate IR bundle JSON via build_full_diagnostic_report.")
    p.add_argument("bundle", type=Path, help="Path to JSON containing ir_goal")
    args = p.parse_args()

    from src.diagnostics.report import build_full_diagnostic_report
    from src.ir.canonical_ir import ir_goal_from_json, validate_bundle_envelope

    data = json.loads(args.bundle.read_text(encoding="utf-8"))
    env_e = validate_bundle_envelope(data)
    goal = ir_goal_from_json(data)
    rep = build_full_diagnostic_report(goal, bundle_envelope_errors=env_e)
    sys.stdout.write(json.dumps(rep, indent=2) + "\n")
    return 0 if rep.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
