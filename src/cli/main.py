"""
``torqa`` CLI entrypoint (``pyproject.toml`` console script → ``main()``).

Primary flows: ``project`` (materialize to disk), ``surface`` (.tq/.pxir → IR JSON + diagnostics),
``validate`` / ``bundle-lint`` (IR bundle JSON only). Other subcommands are tooling (run, patch,
AI, maintainer checks).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

from src.ai.adapter import suggest_ir_bundle_from_prompt
from src.control.ir_mutation_json import try_apply_ir_mutations_from_json
from src.control.patch_preview import build_patch_preview_report
from src.diagnostics.report import build_full_diagnostic_report
from src.diagnostics.system_health import build_system_health_report
from src.execution.engine_routing import run_rust_pipeline_with_fallback
from src.ir.canonical_ir import ir_goal_from_json, ir_goal_to_json, validate_bundle_envelope
from src.ir.migrate import migrate_ir_bundle
from src.surface.parse_pxir import parse_pxir_source
from src.surface.parse_tq import TQParseError, parse_tq_source
from src.orchestrator.pipeline_run import build_console_run_payload
from src.ir.explain import explain_ir_goal
from src.ir.quality import build_ir_quality_report
from src.orchestrator.system_orchestrator import SystemOrchestrator
from src.projection.projection_strategy import ProjectionContext, explain_projection_strategy
from src.evolution.ai_proposal_gate import evaluate_ai_proposal
from src.language.authoring_prompt import language_reference_payload, minimal_valid_bundle_json
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from src.project_materialize import load_bundle_from_source, materialize_project


def _load_bundle(path: Path) -> Dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _emit(obj: Any, args: argparse.Namespace, *, stream=None) -> None:
    stream = stream or sys.stdout
    indent = None if getattr(args, "json", False) else 2
    stream.write(json.dumps(obj, indent=indent, default=str) + "\n")


def _write_artifacts(artifacts: List[Dict[str, Any]], root: Path) -> None:
    for art in artifacts:
        for fi in art.get("files") or []:
            fn = fi.get("filename")
            content = fi.get("content")
            if not fn or not isinstance(content, str):
                continue
            out = root / fn
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(content, encoding="utf-8")


def cmd_validate(args: argparse.Namespace) -> int:
    bundle = _load_bundle(Path(args.file))
    env_e = validate_bundle_envelope(bundle)
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    _emit(rep, args)
    return 0 if rep["ok"] else 1


def cmd_diagnostics(args: argparse.Namespace) -> int:
    return cmd_validate(args)


def cmd_explain(args: argparse.Namespace) -> int:
    g = ir_goal_from_json(_load_bundle(Path(args.file)))
    _emit(explain_ir_goal(g), args)
    return 0


def cmd_quality(args: argparse.Namespace) -> int:
    g = ir_goal_from_json(_load_bundle(Path(args.file)))
    _emit(build_ir_quality_report(g), args)
    return 0


def cmd_strategy_explain(args: argparse.Namespace) -> int:
    g = ir_goal_from_json(_load_bundle(Path(args.file)))
    reg = default_ir_function_registry()
    sem = build_ir_semantic_report(g, reg)
    _emit(explain_projection_strategy(g, sem, None, ProjectionContext()), args)
    return 0


def cmd_project(args: argparse.Namespace) -> int:
    src_arg = getattr(args, "source", None) or args.file
    if not src_arg:
        _emit(
            {"written": [], "errors": ["missing source: pass a bundle file or --source PATH"], "ok": False},
            args,
            stream=sys.stderr,
        )
        return 1
    src_path = Path(src_arg)
    if not src_path.is_absolute():
        src_path = (Path.cwd() / src_path).resolve()
    try:
        bundle = load_bundle_from_source(src_path)
    except (OSError, ValueError, json.JSONDecodeError, UnicodeDecodeError) as ex:
        _emit({"written": [], "errors": [str(ex)], "ok": False}, args, stream=sys.stderr)
        return 1
    except TQParseError as ex:
        _emit(
            {"written": [], "errors": [str(ex)], "ok": False, "code": ex.code},
            args,
            stream=sys.stderr,
        )
        return 1

    dest_root = Path(args.root).resolve() / Path(args.out)
    ok, summary, _written = materialize_project(bundle, dest_root, engine_mode=args.engine_mode)
    payload = {
        "ok": ok,
        "written": summary.get("written", []),
        "errors": summary.get("errors", []),
        "written_under": summary.get("written_under"),
        "consistency_errors": summary.get("consistency_errors", []),
        "local_webapp": summary.get("local_webapp"),
    }
    diag = summary.get("diagnostics")
    if diag is not None:
        payload["diagnostics"] = diag
    if diag is not None and not diag.get("ok", False):
        _emit(payload, args, stream=sys.stderr)
        return 1
    _emit(payload, args)
    return 0 if ok else 2


def cmd_demo(args: argparse.Namespace) -> int:
    """Write all projection surfaces (webapp + SQL + language stubs) for a tryable demo tree."""
    bundle = _load_bundle(Path(args.file))
    env_e = validate_bundle_envelope(bundle)
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    if not rep["ok"]:
        _emit({"ok": False, "diagnostics": rep}, args, stream=sys.stderr)
        return 1
    root = Path(args.out)
    orch = SystemOrchestrator(g, context=ProjectionContext(), engine_mode=args.engine_mode)
    out = orch.run_v4() if hasattr(orch, "run_v4") else orch.run()
    _write_artifacts(out.get("artifacts", []), root)
    surfaces = []
    for art in out.get("artifacts") or []:
        surfaces.append(
            {
                "target_language": art.get("target_language"),
                "purpose": art.get("purpose"),
                "file_count": len(art.get("files") or []),
            }
        )
    web = root / "generated" / "webapp"
    _emit(
        {
            "ok": True,
            "written_under": str(root.resolve()),
            "surfaces": surfaces,
            "consistency_errors": out.get("consistency_errors", []),
            "try_next": {
                "vite_dev": f"cd {web.as_posix()} && npm install && npm run dev",
                "other_outputs": "See generated/sql/, generated/rust/, generated/python/, etc.",
            },
        },
        args,
    )
    return 0 if not out.get("consistency_errors") else 2


def cmd_run(args: argparse.Namespace) -> int:
    bundle = _load_bundle(Path(args.file))
    g = ir_goal_from_json(bundle)
    inputs: Dict[str, Any] = {}
    if args.inputs_json:
        inputs = json.loads(args.inputs_json)
    elif args.inputs_file:
        with open(args.inputs_file, encoding="utf-8") as f:
            inputs = json.load(f)
    routing, rust_out, fb = run_rust_pipeline_with_fallback(g, inputs, mode=args.engine_mode)
    _emit({"routing": routing, "rust_output": rust_out, "fallback": fb}, args)
    return 0


def cmd_guided(args: argparse.Namespace) -> int:
    """Full diagnostics then full pipeline (same payload shape as web /api/run)."""
    bundle = _load_bundle(Path(args.file))
    env_e = validate_bundle_envelope(bundle)
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    if not rep["ok"]:
        _emit({"stage": "diagnostics_failed", "diagnostics": rep}, args, stream=sys.stderr)
        return 1
    inputs: Dict[str, Any] = {}
    if args.inputs_json:
        inputs = json.loads(args.inputs_json)
    elif args.inputs_file:
        with open(args.inputs_file, encoding="utf-8") as f:
            inputs = json.load(f)
    out = build_console_run_payload(
        g,
        inputs,
        engine_mode=args.engine_mode,
        bundle_envelope_errors=env_e,
    )
    out["stage"] = "complete"
    _emit(out, args)
    ce = (out.get("orchestrator") or {}).get("consistency_errors") or []
    if ce:
        return 2
    if not out.get("diagnostics", {}).get("ok"):
        return 1
    return 0


def cmd_ai_suggest(args: argparse.Namespace) -> int:
    res = suggest_ir_bundle_from_prompt(args.prompt, max_retries=args.max_retries, model=args.model)
    _emit(res, args)
    return 0 if res.get("ok") else 1


def cmd_language(args: argparse.Namespace) -> int:
    """Emit machine-readable core language reference (builtins, rules, minimal bundle)."""
    if getattr(args, "minimal_json", False):
        ind = None if getattr(args, "json", False) else 2
        sys.stdout.write(minimal_valid_bundle_json(indent=ind) + "\n")
        return 0
    _emit(language_reference_payload(), args)
    return 0


def cmd_bundle_lint(args: argparse.Namespace) -> int:
    """Summarize diagnostic issue counts by formal_phase; exit 1 if not ok."""
    bundle = _load_bundle(Path(args.file))
    env_e = validate_bundle_envelope(bundle)
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    by_phase: Dict[str, int] = {}
    for i in rep.get("issues") or []:
        fp = str(i.get("formal_phase") or "unknown")
        by_phase[fp] = by_phase.get(fp, 0) + 1
    summary = {
        "ok": rep["ok"],
        "issue_count": len(rep.get("issues") or []),
        "warning_count": len(rep.get("warnings") or []),
        "by_formal_phase": dict(sorted(by_phase.items())),
    }
    _emit(summary, args)
    return 0 if rep["ok"] else 1


def cmd_surface(args: argparse.Namespace) -> int:
    """Compile ``.pxir`` or ``.tq`` surface subset to canonical bundle JSON (stdout or --out)."""
    path = Path(args.file)
    raw = path.read_text(encoding="utf-8")
    try:
        if path.suffix.lower() == ".tq":
            bundle = parse_tq_source(raw)
        else:
            bundle = parse_pxir_source(raw)
    except TQParseError as ex:
        err_obj = {"ok": False, "code": ex.code, "message": str(ex)}
        _emit(err_obj, args, stream=sys.stderr)
        return 1
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g)
    if args.out:
        Path(args.out).write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    _emit({"ok": rep["ok"], "diagnostics": rep, "ir_bundle": bundle}, args)
    return 0 if rep["ok"] else 1


def cmd_migrate(args: argparse.Namespace) -> int:
    """Migrate bundle metadata between documented ir_version values."""
    bundle = _load_bundle(Path(args.file))
    new_b, warnings = migrate_ir_bundle(bundle, args.from_version, args.to_version)
    if args.out:
        Path(args.out).write_text(json.dumps(new_b, indent=2), encoding="utf-8")
    _emit({"ok": True, "warnings": warnings, "bundle": new_b}, args)
    return 0


def cmd_patch(args: argparse.Namespace) -> int:
    bundle = _load_bundle(Path(args.file))
    with open(args.mutations, encoding="utf-8") as f:
        mutations = json.load(f)
    if not isinstance(mutations, list):
        _emit({"ok": False, "error": "mutations file must be a JSON array"}, args, stream=sys.stderr)
        return 1
    g = ir_goal_from_json(bundle)
    new_g, err = try_apply_ir_mutations_from_json(g, mutations)
    if err:
        _emit({"ok": False, "error": err}, args, stream=sys.stderr)
        return 1
    rep = build_full_diagnostic_report(new_g)
    out = {"ok": rep["ok"], "ir_bundle": ir_goal_to_json(new_g), "diagnostics": rep}
    if args.out:
        Path(args.out).write_text(json.dumps(out["ir_bundle"], indent=2), encoding="utf-8")
    _emit(out, args)
    return 0 if rep["ok"] else 2


def cmd_preview_patch(args: argparse.Namespace) -> int:
    bundle = _load_bundle(Path(args.file))
    with open(args.mutations, encoding="utf-8") as f:
        mutations = json.load(f)
    if not isinstance(mutations, list):
        _emit({"ok": False, "error": "mutations must be a JSON array"}, args, stream=sys.stderr)
        return 1
    g = ir_goal_from_json(bundle)
    rep = build_patch_preview_report(g, mutations)
    _emit(rep, args)
    return 0 if rep.get("ok") else 1


def cmd_proposal_gate(args: argparse.Namespace) -> int:
    """SELF_EVOLUTION_PIPELINE gate: envelope + diagnostics + light secret scan."""
    bundle = _load_bundle(Path(args.file))
    out = evaluate_ai_proposal(bundle)
    _emit(out, args)
    return 1 if out.get("rejected") else 0


def cmd_check(args: argparse.Namespace) -> int:
    bundle = _load_bundle(Path(args.file))
    g = ir_goal_from_json(bundle)
    inputs: Dict[str, Any] = {}
    if args.inputs_json:
        inputs = json.loads(args.inputs_json)
    elif args.inputs_file:
        with open(args.inputs_file, encoding="utf-8") as f:
            inputs = json.load(f)
    report = build_system_health_report(
        g,
        demo_inputs=inputs,
        engine_mode=args.engine_mode,
        include_parity=not args.skip_parity,
    )
    _emit(report, args)
    if getattr(args, "output", None):
        Path(args.output).write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    cp = report.get("checkpoints", {})
    ok = all(
        cp.get(k)
        for k in (
            "diagnostics_ok",
            "semantic_ok",
            "artifact_validation_ok",
            "website_threshold_passed",
            "orchestrator_consistency_clean",
        )
    )
    return 0 if ok else 3


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="torqa",
        description=(
            "TORQA toolchain. Default happy path: torqa project --source <.tq|bundle.json> "
            "(materialize under --root/--out). validate/bundle-lint/guided/check/run take IR bundle JSON only, "
            "not .tq; use surface or project for .tq."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
        "  torqa project --root . --source examples/workspace_minimal/app.tq --out generated_out --engine-mode python_only\n"
        "  torqa surface examples/workspace_minimal/app.tq --out ir_bundle.json\n"
        "  torqa --json validate examples/core/valid_minimal_flow.json\n"
        "  torqa bundle-lint examples/core/valid_minimal_flow.json\n"
        "  torqa guided examples/core/valid_minimal_flow.json --inputs-json '{\"username\":\"a\"}'\n"
        "  torqa check examples/core/valid_minimal_flow.json --inputs-json '{\"username\":\"a\"}'\n"
        "  torqa demo\n"
        "  torqa surface examples/surface/minimal.pxir --out bundle.json\n"
        "  torqa project --root . --source examples/core/valid_minimal_flow.json --out generated_out --engine-mode python_only\n"
        "  torqa language --minimal-json\n"
        "  torqa migrate old.json --from-version 1.3 --to-version 1.4 --out new.json\n"
        "  torqa proposal-gate bundle.json\n"
        "  torqa preview-patch bundle.json mutations.json\n",
    )
    p.add_argument(
        "--json",
        action="store_true",
        help="Emit compact JSON (place before subcommand: torqa --json validate FILE)",
    )

    sub = p.add_subparsers(dest="cmd", required=True)

    def add_engine_mode(ap: argparse.ArgumentParser) -> None:
        ap.add_argument(
            "--engine-mode",
            type=str,
            default="rust_preferred",
            choices=["rust_preferred", "python_only", "rust_only"],
        )

    pv = sub.add_parser(
        "validate",
        help="Full diagnostic report for an IR bundle JSON file (structural + semantic + handoff); not for .tq",
    )
    pv.add_argument(
        "file",
        type=str,
        metavar="BUNDLE.json",
        help="IR bundle JSON path (.json only; use surface or project for .tq)",
    )
    pv.set_defaults(func=cmd_validate)

    pd = sub.add_parser("diagnostics", help="Same as validate (alias); IR bundle JSON only")
    pd.add_argument(
        "file",
        type=str,
        metavar="BUNDLE.json",
        help="IR bundle JSON path (.json only)",
    )
    pd.set_defaults(func=cmd_diagnostics)

    pe = sub.add_parser("explain", help="Structured IR introspection (JSON bundle file only)")
    pe.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    pe.set_defaults(func=cmd_explain)

    pq = sub.add_parser("quality", help="IR quality metrics (JSON bundle file only)")
    pq.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    pq.set_defaults(func=cmd_quality)

    ps = sub.add_parser("strategy", help="Projection strategy scoring (JSON bundle file only)")
    ps.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    ps.set_defaults(func=cmd_strategy_explain)

    pp = sub.add_parser(
        "project",
        help="Validate bundle (.json / .tq / .pxir), run orchestrator, write artifact tree under --root/--out",
    )
    pp.add_argument(
        "file",
        type=str,
        nargs="?",
        default=None,
        help="Path to bundle JSON, .tq, or .pxir (optional if --source is set)",
    )
    pp.add_argument(
        "--source",
        type=str,
        default=None,
        help="Explicit source path (same formats as positional file)",
    )
    pp.add_argument(
        "--root",
        type=str,
        default=".",
        help="Project root directory (default: current directory)",
    )
    pp.add_argument(
        "--out",
        type=str,
        default="generated_out",
        help="Subdirectory under --root for materialized paths (default: generated_out)",
    )
    add_engine_mode(pp)
    pp.set_defaults(func=cmd_project)

    pdemo = sub.add_parser(
        "demo",
        help=(
            "Alternate demo writer: JSON bundle to flat --out tree (default sample bundle). "
            "For F1 materialize with --root/--out, prefer project."
        ),
    )
    pdemo.add_argument(
        "file",
        type=str,
        nargs="?",
        metavar="BUNDLE.json",
        default="examples/core/demo_multi_surface_flow.json",
        help="IR bundle JSON (default: examples/core/demo_multi_surface_flow.json)",
    )
    pdemo.add_argument("--out", type=str, default="demo_out")
    add_engine_mode(pdemo)
    pdemo.set_defaults(func=cmd_demo)

    pr = sub.add_parser("run", help="Engine pipeline from IR bundle JSON (Rust-preferred)")
    pr.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    pr.add_argument("--inputs-json", type=str, default=None)
    pr.add_argument("--inputs-file", type=str, default=None)
    add_engine_mode(pr)
    pr.set_defaults(func=cmd_run)

    pg = sub.add_parser(
        "guided",
        help=(
            "IR bundle JSON: full diagnostics then full pipeline (engine + orchestrator; same shape as web /api/run)"
        ),
    )
    pg.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    pg.add_argument("--inputs-json", type=str, default=None)
    pg.add_argument("--inputs-file", type=str, default=None)
    add_engine_mode(pg)
    pg.set_defaults(func=cmd_guided)

    plang = sub.add_parser(
        "language",
        help="Core IR language reference (builtins, handoff rules, minimal bundle) for authors and LLMs",
    )
    plang.add_argument(
        "--minimal-json",
        action="store_true",
        help="Print only minimal valid ir_goal bundle JSON (stable sort_keys); pair with --json for one line",
    )
    plang.set_defaults(func=cmd_language)

    plint = sub.add_parser(
        "bundle-lint",
        help="IR bundle JSON: summarize issue counts by formal_phase; exit 1 if diagnostics not ok",
    )
    plint.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    plint.set_defaults(func=cmd_bundle_lint)

    psurf = sub.add_parser(
        "surface",
        help="Compile surface file (.pxir or .tq) to canonical JSON IR bundle",
    )
    psurf.add_argument("file", type=str)
    psurf.add_argument("--out", type=str, default=None, help="Write bundle JSON to this path")
    psurf.set_defaults(func=cmd_surface)

    pmig = sub.add_parser(
        "migrate",
        help="Migrate IR bundle JSON ir_version (e.g. 1.3 to 1.4); writes JSON to --out or stdout",
    )
    pmig.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    pmig.add_argument("--from-version", dest="from_version", type=str, required=True)
    pmig.add_argument("--to-version", dest="to_version", type=str, required=True)
    pmig.add_argument("--out", type=str, default=None)
    pmig.set_defaults(func=cmd_migrate)

    pgate = sub.add_parser(
        "proposal-gate",
        help="Reject or accept an AI-proposed IR bundle JSON (envelope + diagnostics + policy scan; exit 1 if rejected)",
    )
    pgate.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    pgate.set_defaults(func=cmd_proposal_gate)

    pa = sub.add_parser("ai-suggest", help="LLM IR proposal (validated; needs OPENAI_API_KEY)")
    pa.add_argument("prompt", type=str)
    pa.add_argument("--max-retries", type=int, default=3)
    pa.add_argument("--model", type=str, default=None)
    pa.set_defaults(func=cmd_ai_suggest)

    ppatch = sub.add_parser("patch", help="Apply JSON mutations to an IR bundle JSON file")
    ppatch.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    ppatch.add_argument("mutations", type=str)
    ppatch.add_argument("--out", type=str, default=None)
    ppatch.set_defaults(func=cmd_patch)

    pprev = sub.add_parser(
        "preview-patch",
        help="Preview patch on IR bundle JSON: diff + diagnostics + risk (no file write)",
    )
    pprev.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    pprev.add_argument("mutations", type=str)
    pprev.set_defaults(func=cmd_preview_patch)

    pch = sub.add_parser(
        "check",
        help="Maintainer / CI-style checkpoint from IR bundle JSON: diagnostics, strategy, quality, engine, parity",
    )
    pch.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    pch.add_argument("--inputs-json", type=str, default=None)
    pch.add_argument("--inputs-file", type=str, default=None)
    pch.add_argument("--skip-parity", action="store_true", help="Skip Rust/Python parity (faster)")
    add_engine_mode(pch)
    pch.add_argument("--output", type=str, default=None, help="Also write full JSON report to this path")
    pch.set_defaults(func=cmd_check)

    args = p.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
