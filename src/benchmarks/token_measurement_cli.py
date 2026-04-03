"""CLI: ``torqa-token-measure`` — JSON token measurement report (standard metric names)."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="TORQA deterministic token measurement (prompt, .tq, IR, generated files)."
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_bench = sub.add_parser("benchmark-dir", help="P31 layout: BENCHMARK_TASK.md, app.tq, expected_output_summary.json")
    p_bench.add_argument("benchmark_dir", type=Path)
    p_bench.add_argument("--repo-root", type=Path, default=None)
    p_bench.add_argument("--materialize-root", type=Path, default=None)
    p_bench.add_argument("--no-generated", action="store_true")
    p_bench.add_argument("--write", type=Path, default=None)
    p_bench.add_argument("--keep-temp", action="store_true")

    p_files = sub.add_parser("files", help="Measure arbitrary prompt, .tq, and IR JSON files")
    p_files.add_argument("--prompt", type=Path, required=True)
    p_files.add_argument("--tq", type=Path, required=True)
    p_files.add_argument(
        "--ir-json",
        type=Path,
        required=True,
        help="IR bundle JSON (object with ir_goal) or raw ir_goal object",
    )
    p_files.add_argument(
        "--generated-root",
        type=Path,
        default=None,
        help="Root directory; --generated-relative paths are resolved under it",
    )
    p_files.add_argument(
        "--generated-relative",
        action="append",
        default=[],
        help="Relative path under --generated-root (repeatable); sorted for stable sum",
    )
    p_files.add_argument("--write", type=Path, default=None)

    args = parser.parse_args(argv)

    from src.benchmarks.token_measurement import (
        build_token_measurement_report,
        measurement_report_to_canonical_json,
        public_measurement_report,
        run_measurement_for_p31_benchmark_dir,
    )

    ephemeral: str | None = None
    try:
        if args.cmd == "benchmark-dir":
            repo_root = args.repo_root.resolve() if args.repo_root else Path.cwd().resolve()
            if args.no_generated:
                report = run_measurement_for_p31_benchmark_dir(
                    args.benchmark_dir,
                    repo_root=repo_root,
                    materialize_root=None,
                    auto_materialize=False,
                )
            elif args.materialize_root is not None:
                report = run_measurement_for_p31_benchmark_dir(
                    args.benchmark_dir,
                    repo_root=repo_root,
                    materialize_root=args.materialize_root.resolve(),
                    auto_materialize=False,
                )
            else:
                report = run_measurement_for_p31_benchmark_dir(
                    args.benchmark_dir,
                    repo_root=repo_root,
                    auto_materialize=True,
                )
            ephemeral = report.get("_ephemeral_materialize_root")
        else:
            prompt_text = args.prompt.read_text(encoding="utf-8")
            tq_text = args.tq.read_text(encoding="utf-8")
            ir_raw = json.loads(args.ir_json.read_text(encoding="utf-8"))
            if isinstance(ir_raw, dict) and "ir_goal" in ir_raw:
                ir_goal = ir_raw["ir_goal"]
            else:
                ir_goal = ir_raw
            if not isinstance(ir_goal, dict):
                print("IR JSON must be an object or contain ir_goal object", file=sys.stderr)
                return 2
            gen_paths = None
            if args.generated_root is not None:
                root = args.generated_root.resolve()
                rels = sorted(args.generated_relative) if args.generated_relative else []
                gen_paths = [root / Path(r) for r in rels]
            report = build_token_measurement_report(
                prompt_text=prompt_text,
                torqa_surface_text=tq_text,
                ir_goal=ir_goal,
                generated_file_paths=gen_paths,
                sources={
                    "prompt": str(args.prompt),
                    "torqa_surface": str(args.tq),
                    "ir_json": str(args.ir_json),
                },
            )

        pub = public_measurement_report(report)
        print(json.dumps(pub, indent=2, ensure_ascii=False, sort_keys=True))
        w = getattr(args, "write", None)
        if w:
            w.parent.mkdir(parents=True, exist_ok=True)
            w.write_text(measurement_report_to_canonical_json(public_measurement_report(report)), encoding="utf-8")
    finally:
        if ephemeral and args.cmd == "benchmark-dir" and not getattr(args, "keep_temp", False):
            shutil.rmtree(ephemeral, ignore_errors=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
