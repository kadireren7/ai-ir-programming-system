"""
P35: one entrypoint to list canonical flagship demo commands; ``verify`` checks assets + gate + bench JSON.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
_FLAGSHIP = _REPO / "examples" / "benchmark_flagship"
_GATE_MANIFEST = _FLAGSHIP / "gate_invalid" / "manifest.json"
_BASELINE = _FLAGSHIP / "compression_baseline_report.json"


HELP_TEXT = """TORQA public flagship demo - first-trial happy path (repo root)

  Single entry (main CLI):  torqa demo          (prints this path)
  Sanity check:             torqa demo verify   (same as: torqa-flagship verify)

  Canonical flow (do this once to see the full story):
    1) pip install -e .
    2) torqa demo verify
    3) torqa build examples/benchmark_flagship/app.tq
       -> materialized tree under generated_out/ (see docs/FLAGSHIP_DEMO.md)
    4) torqa-console
       -> http://127.0.0.1:8000/ (product site, /console IR lab, /desktop editor shell)
       (fallback if PATH: python -m webui)
    5) Inspect proof: examples/benchmark_flagship/compression_baseline_report.json
       torqa demo benchmark              (human summary of that baseline — no server)
       torqa-gate-proof
       torqa-compression-bench examples/benchmark_flagship --repo-root .

  Multi-surface JSON demo emit (optional; not the flagship .tq path):
    torqa demo emit
    torqa demo emit path/to/bundle.json --out demo_out

  Regenerate compression baseline (optional; writes JSON):
    torqa-compression-bench examples/benchmark_flagship --repo-root . \\
      --write examples/benchmark_flagship/compression_baseline_report.json

  Official desktop (Electron — torqa CLI only, no duplicated validation):
    torqa-desktop
    (needs: cd desktop && npm install; first run may npm run build)
    Legacy Python/Tk or pywebview: torqa-desktop-legacy  /  python -m desktop_legacy --tk

  Legacy alias: torqa-flagship (same help text and verify)
  Trial limits + expectations: docs/TRIAL_READINESS.md
  Trial package index: examples/trial_ready/README.md
  Deep walkthrough: docs/FLAGSHIP_DEMO.md
"""


def demo_benchmark(*, json_out: bool = False) -> int:
    """
    Print flagship ``compression_baseline_report.json`` (human table or full JSON).
    Same file the web UI reads via ``/api/demo/benchmark-report``.
    """
    if not _BASELINE.is_file():
        print(f"demo benchmark: missing {_BASELINE.relative_to(_REPO)}", file=sys.stderr)
        return 1
    try:
        data = json.loads(_BASELINE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as ex:
        print(f"demo benchmark: {ex}", file=sys.stderr)
        return 1
    if data.get("schema_version") != 1 or "metrics" not in data:
        print("demo benchmark: compression_baseline_report.json shape invalid", file=sys.stderr)
        return 1
    if json_out:
        sys.stdout.write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        return 0
    m = data.get("metrics") or {}
    task = m.get("task_prompt_token_estimate")
    tq = m.get("torqa_source_token_estimate")
    ratio = m.get("semantic_compression_ratio")
    lines = [
        "TORQA trial benchmark (flagship baseline on disk)",
        f"  benchmark_id: {data.get('benchmark_id', '')}",
        f"  estimator:    {data.get('estimator_id', '')}",
        f"  NL task (est. tokens): {task}",
        f"  .tq surface (est.):     {tq}",
        f"  semantic_compression_ratio (NL / .tq): {ratio}",
        "",
        "  See also: torqa-console -> product page (live panel); docs/BENCHMARK_COMPRESSION.md",
        f"  JSON path: {_BASELINE.relative_to(_REPO).as_posix()}",
    ]
    sys.stdout.write("\n".join(lines) + "\n")
    return 0


def verify() -> int:
    required = [
        _FLAGSHIP / "app.tq",
        _FLAGSHIP / "BENCHMARK_TASK.md",
        _FLAGSHIP / "expected_output_summary.json",
        _GATE_MANIFEST,
        _BASELINE,
    ]
    for p in required:
        if not p.is_file():
            print(f"flagship verify: missing {p.relative_to(_REPO)}", file=sys.stderr)
            return 1

    from src.benchmarks.compression_report import public_benchmark_report, run_compression_benchmark
    from src.benchmarks.gate_proof import run_gate_proof_manifest

    rep = run_gate_proof_manifest(_GATE_MANIFEST)
    if rep["summary"]["mismatch_with_expectation"] != 0:
        print("flagship verify: gate proof expectations failed", file=sys.stderr)
        return 1

    try:
        data = json.loads(_BASELINE.read_text(encoding="utf-8"))
        if data.get("schema_version") != 1 or "metrics" not in data:
            print("flagship verify: compression_baseline_report.json shape invalid", file=sys.stderr)
            return 1
    except (OSError, json.JSONDecodeError) as ex:
        print(f"flagship verify: baseline JSON: {ex}", file=sys.stderr)
        return 1

    try:
        raw = run_compression_benchmark(_FLAGSHIP, repo_root=_REPO)
        pub = public_benchmark_report(raw)
        if pub.get("benchmark_id") != data.get("benchmark_id"):
            print("flagship verify: benchmark_id drift vs baseline file", file=sys.stderr)
            return 1
    except Exception as ex:
        print(f"flagship verify: compression benchmark: {ex}", file=sys.stderr)
        return 1

    return 0


def main(argv: list[str] | None = None) -> int:
    argv = list(argv if argv is not None else sys.argv[1:])
    if argv == ["verify"]:
        return verify()
    if argv:
        print(
            "Usage: torqa-flagship   or   torqa-flagship verify  "
            "(prefer: torqa demo  /  torqa demo verify)",
            file=sys.stderr,
        )
        return 2
    sys.stdout.write(HELP_TEXT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
