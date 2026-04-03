"""
``torqa`` CLI entrypoint (``pyproject.toml`` console script → ``main()``).

Primary flow: ``build`` (then ``project``) materialize to disk; ``surface`` (.tq/.pxir -> IR JSON + diagnostics),
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
from src.diagnostics import codes as diag_codes
from src.diagnostics.formal_phases import formal_phase_for_issue
from src.diagnostics.report import build_full_diagnostic_report, build_ir_shape_error_report
from src.diagnostics.summary import summarize_pipeline_stages
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
from src.project_materialize import materialize_project, parse_stage, stabilize_projection_artifacts
from src.diagnostics.user_hints import (
    augment_issue,
    format_tq_cli_error,
    merge_onboarding_suggested_next,
    onboarding_suggested_next_prefix,
    suggested_next_for_surface_or_project_fail,
    suggested_next_from_report,
    tq_parse_extras,
)
from src.packages.cli_hints import format_package_cli_error
from src.torqa_self.suggested_next_merge_cap_ir import suggested_next_display_cap
from src.torqa_self.validate_open_hints_ir import (
    validate_open_hints_for_bad_extension,
    validate_open_hints_for_bad_json,
    validate_open_hints_for_not_dict,
    validate_open_hints_for_tq_path,
)


def _load_bundle(path: Path) -> Dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _emit(obj: Any, args: argparse.Namespace, *, stream=None) -> None:
    stream = stream or sys.stdout
    indent = None if getattr(args, "json", False) else 2
    stream.write(json.dumps(obj, indent=indent, default=str) + "\n")


def _open_json_bundle_file(path: Path) -> tuple[Dict[str, Any] | None, Dict[str, Any] | None]:
    """
    For ``validate`` / ``bundle-lint``: only ``.json`` IR bundles.
    Returns (bundle, error_report); error_report is emit-ready diagnostic shape.
    """
    suf = path.suffix.lower()
    if suf in (".tq", ".pxir"):
        rel = path.name
        rep = {
            "ok": False,
            "issues": [
                augment_issue(
                    {
                        "code": diag_codes.PX_PARSE_FAILED,
                        "phase": "structural",
                        "formal_phase": formal_phase_for_issue(diag_codes.PX_PARSE_FAILED, "structural"),
                        "message": (
                            "torqa validate expects an IR bundle .json file; "
                            f"{rel!r} looks like a surface file ({suf!r}). "
                            "Use: torqa surface … --out bundle.json  OR  torqa project --source …"
                        ),
                    }
                )
            ],
            "warnings": [],
            "semantic_report": {"errors": [], "warnings": []},
            "suggested_next": validate_open_hints_for_tq_path(path),
        }
        return None, rep
    if suf != ".json":
        rep = {
            "ok": False,
            "issues": [
                augment_issue(
                    {
                        "code": diag_codes.PX_PARSE_FAILED,
                        "phase": "structural",
                        "formal_phase": formal_phase_for_issue(diag_codes.PX_PARSE_FAILED, "structural"),
                        "message": (
                            f"torqa validate expects a .json IR bundle path; got extension {suf!r}. "
                            "Use .json, or use torqa surface / torqa project for .tq / .pxir."
                        ),
                    }
                )
            ],
            "warnings": [],
            "semantic_report": {"errors": [], "warnings": []},
            "suggested_next": validate_open_hints_for_bad_extension(),
        }
        return None, rep
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as ex:
        rep = {
            "ok": False,
            "issues": [
                augment_issue(
                    {
                        "code": diag_codes.PX_PARSE_FAILED,
                        "phase": "structural",
                        "formal_phase": formal_phase_for_issue(diag_codes.PX_PARSE_FAILED, "structural"),
                        "message": f"Not valid JSON: {ex}",
                    }
                )
            ],
            "warnings": [],
            "semantic_report": {"errors": [], "warnings": []},
            "suggested_next": validate_open_hints_for_bad_json(),
        }
        return None, rep
    if not isinstance(data, dict):
        rep = {
            "ok": False,
            "issues": [
                augment_issue(
                    {
                        "code": diag_codes.PX_PARSE_FAILED,
                        "phase": "structural",
                        "formal_phase": formal_phase_for_issue(diag_codes.PX_PARSE_FAILED, "structural"),
                        "message": "Bundle root must be a JSON object.",
                    }
                )
            ],
            "warnings": [],
            "semantic_report": {"errors": [], "warnings": []},
            "suggested_next": validate_open_hints_for_not_dict(),
        }
        return None, rep
    return data, None


def _project_payload_to_human(payload: Dict[str, Any]) -> str:
    """ASCII-only summary for project/build when not using --json."""
    diag = payload.get("diagnostics")
    if diag is not None and not diag.get("ok", True):
        issues: List[dict] = list(diag.get("issues") or [])
        first = issues[0] if issues else {}
        lines = ["ERROR", "  Diagnostics failed", f"  Reason: {first.get('message', 'unknown')}"]
        if first.get("code"):
            lines.append(f"  Code: {first['code']}")
        sn = list(payload.get("suggested_next") or diag.get("suggested_next") or [])
        if sn:
            lines.append("  Next:")
            for s in sn[:8]:
                lines.append(f"    - {s}")
        return "\n".join(lines)

    written = list(payload.get("written") or [])
    if payload.get("ok") is False and not written:
        err = (payload.get("errors") or ["unknown"])[0]
        code = payload.get("code")
        if isinstance(code, str) and code.startswith("PX_TQ_"):
            tq_p = payload.get("source_path")
            tp = Path(tq_p) if isinstance(tq_p, str) else None
            lines = [format_tq_cli_error(code, err, tq_path=tp)]
            sn = list(payload.get("suggested_next") or [])
            if sn:
                lines.append("")
                lines.append("Next:")
                for s in sn[:8]:
                    lines.append(f"  - {s}")
            return "\n".join(lines)
        lines = ["ERROR", "  Could not materialize", f"  Reason: {err}"]
        if code:
            lines.append(f"  Code: {code}")
        if payload.get("hint"):
            lines.append(f"  Hint: {payload['hint']}")
        sn = list(payload.get("suggested_next") or [])
        if sn:
            lines.append("  Next:")
            for s in sn[:8]:
                lines.append(f"    - {s}")
        return "\n".join(lines)

    if payload.get("ok") is False:
        lines = ["ERROR", "  Orchestrator consistency check failed"]
        for e in (payload.get("errors") or [])[:8]:
            lines.append(f"  - {e}")
        lines.append("  Next: torqa --json project ... for full JSON payload")
        for item in onboarding_suggested_next_prefix():
            lines.append(f"  {item}")
        return "\n".join(lines)

    wu = payload.get("written_under") or "(unknown)"
    lines = ["SUCCESS", "", "Output:", f"  {wu}", "", "Next:"]
    lw = payload.get("local_webapp")
    if lw and isinstance(lw, dict):
        url = lw.get("default_dev_url", "http://localhost:5173")
        if sys.platform == "win32":
            cmd = lw.get("commands_powershell") or lw.get("commands_posix") or lw.get(
                "commands_from_materialize_root", ""
            )
        else:
            cmd = lw.get("commands_posix") or lw.get("commands_from_materialize_root", "")
        abs_web = lw.get("webapp_dir_absolute")
        if cmd:
            lines.append(f"  Web UI (install Node.js if needed): {cmd}")
            lines.append(f"  Then open {url} in a browser (port may differ).")
        elif abs_web:
            lines.append(f"  Web UI folder: {abs_web}")
            lines.append(f"  Run: npm install && npm run dev  then open {url}")
        else:
            lines.append("  Generated webapp paths are under Output/generated/webapp (see torqa --json build for details).")
    else:
        lines.append("  Browse the Output folder for generated sources (SQL, stubs, etc.).")
        lines.append("  Full file list: torqa --json build SOURCE")
    return "\n".join(lines)


def _emit_project_payload(args: argparse.Namespace, payload: Dict[str, Any], stream) -> None:
    if getattr(args, "json", False):
        _emit(payload, args, stream=stream)
    else:
        stream.write(_project_payload_to_human(payload) + "\n")


def _merge_pipeline_json(
    payload: Dict[str, Any], args: argparse.Namespace, stages: List[Dict[str, Any]]
) -> None:
    """P19: optional ``pipeline_stage`` / ``pipeline_stages`` for ``torqa --json build|project``."""
    if getattr(args, "json", False) and stages:
        payload["pipeline_stages"] = list(stages)
        payload["pipeline_stage"] = dict(stages[-1])
        vdig = None
        diag = payload.get("diagnostics")
        if isinstance(diag, dict):
            vdig = diag.get("summary")
        payload["pipeline_summary"] = summarize_pipeline_stages(stages, vdig)


def _project_load_suggested_next(exc: BaseException, resolved_src: Path) -> List[str]:
    if isinstance(exc, FileNotFoundError):
        return merge_onboarding_suggested_next([f"Resolved source path: {resolved_src}"])
    if isinstance(exc, json.JSONDecodeError):
        return merge_onboarding_suggested_next(
            ["torqa language --minimal-json", f"Fix JSON in: {resolved_src}"]
        )
    if isinstance(exc, UnicodeDecodeError):
        return merge_onboarding_suggested_next([f"File must be UTF-8: {resolved_src}"])
    if isinstance(exc, ValueError) and "Unsupported source extension" in str(exc):
        return merge_onboarding_suggested_next(
            [
                "Use .json, .tq, or .pxir as the source extension.",
                "torqa surface FILE.pxir --out bundle.json",
            ]
        )
    return merge_onboarding_suggested_next(["torqa surface FILE.tq --out ir_bundle.json", "torqa language"])


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
    path = Path(args.file)
    bundle, open_err = _open_json_bundle_file(path)
    if open_err is not None:
        _emit(open_err, args)
        return 1
    env_e = validate_bundle_envelope(bundle)
    try:
        g = ir_goal_from_json(bundle)
    except (KeyError, TypeError) as ex:
        rep = build_ir_shape_error_report(ex)
        rep["suggested_next"] = suggested_next_from_report(rep)
        _emit(rep, args)
        return 1
    rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    if not rep["ok"]:
        rep = dict(rep)
        rep["suggested_next"] = suggested_next_from_report(rep)
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
        miss = {
            "written": [],
            "errors": ["missing source: pass a bundle file or --source PATH"],
            "ok": False,
            "suggested_next": merge_onboarding_suggested_next(
                ["torqa project --root . --source examples/workspace_minimal/app.tq"]
            ),
        }
        _emit_project_payload(args, miss, sys.stderr)
        return 1
    src_path = Path(src_arg)
    if not src_path.is_absolute():
        src_path = (Path.cwd() / src_path).resolve()
    pipeline_trace: List[Dict[str, Any]] | None = [] if getattr(args, "json", False) else None
    bundle, perr, _parse_info = parse_stage(src_path)
    if pipeline_trace is not None:
        pipeline_trace.append(_parse_info)
    if perr is not None:
        if isinstance(perr, TQParseError):
            extra = tq_parse_extras(perr.code)
            payload = {
                "written": [],
                "errors": [str(perr)],
                "ok": False,
                "code": perr.code,
                "hint": extra.get("hint"),
                "doc": extra.get("doc"),
                "source_path": str(src_path),
                "suggested_next": suggested_next_for_surface_or_project_fail(),
            }
            _merge_pipeline_json(payload, args, pipeline_trace)
            _emit_project_payload(args, payload, sys.stderr)
            return 1
        payload = {
            "written": [],
            "errors": [str(perr)],
            "ok": False,
            "suggested_next": _project_load_suggested_next(perr, src_path),
        }
        _merge_pipeline_json(payload, args, pipeline_trace)
        _emit_project_payload(args, payload, sys.stderr)
        return 1

    assert bundle is not None

    dest_root = Path(args.root).resolve() / Path(args.out)
    ok, summary, _written = materialize_project(
        bundle,
        dest_root,
        engine_mode=args.engine_mode,
        pipeline_trace=pipeline_trace,
    )
    payload = {
        "ok": ok,
        "written": summary.get("written", []),
        "errors": summary.get("errors", []),
        "written_under": summary.get("written_under"),
        "consistency_errors": summary.get("consistency_errors", []),
        "local_webapp": summary.get("local_webapp"),
    }
    if summary.get("suggested_next"):
        payload["suggested_next"] = summary["suggested_next"]
    diag = summary.get("diagnostics")
    if diag is not None:
        payload["diagnostics"] = diag
    if pipeline_trace is not None:
        _merge_pipeline_json(payload, args, pipeline_trace)
    if getattr(args, "json", False) and summary.get("projection_surfaces") is not None:
        payload["projection_surfaces"] = summary["projection_surfaces"]
    if diag is not None and not diag.get("ok", False):
        _emit_project_payload(args, payload, sys.stderr)
        return 1
    _emit_project_payload(args, payload, sys.stdout)
    return 0 if ok else 2


def cmd_build(args: argparse.Namespace) -> int:
    """Shorthand for ``project`` with a single required source file (same engine and defaults)."""
    inner = argparse.Namespace(
        file=None,
        source=args.file,
        root=args.root,
        out=args.out,
        engine_mode=args.engine_mode,
        json=getattr(args, "json", False),
    )
    return cmd_project(inner)


def cmd_demo_print_path(args: argparse.Namespace) -> int:
    """Print canonical flagship first-trial steps (same text as ``torqa-flagship``)."""
    from src.benchmarks.flagship_demo_cli import HELP_TEXT

    sys.stdout.write(HELP_TEXT)
    return 0


def cmd_demo_verify(args: argparse.Namespace) -> int:
    from src.benchmarks.flagship_demo_cli import verify

    return verify()


def cmd_demo_benchmark(args: argparse.Namespace) -> int:
    from src.benchmarks.flagship_demo_cli import demo_benchmark

    return demo_benchmark(json_out=getattr(args, "json", False))


def cmd_demo_emit(args: argparse.Namespace) -> int:
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
    arts = list(out.get("artifacts", []))
    stabilize_projection_artifacts(arts)
    _write_artifacts(arts, root)
    surfaces = []
    for art in arts:
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
    if getattr(args, "self_host_catalog", False):
        from src.torqa_self.bundle_registry import (
            SINGLE_FLOW_LINE,
            self_host_catalog,
            self_host_group_blurbs,
        )

        _emit(
            {
                "ok": True,
                "single_flow": SINGLE_FLOW_LINE,
                "group_blurbs": self_host_group_blurbs(),
                "entries": self_host_catalog(),
            },
            args,
        )
        return 0
    _emit(language_reference_payload(), args)
    return 0


def cmd_bundle_lint(args: argparse.Namespace) -> int:
    """Summarize diagnostic issue counts by formal_phase; exit 1 if not ok."""
    path = Path(args.file)
    bundle, open_err = _open_json_bundle_file(path)
    if open_err is not None:
        n = len(open_err.get("issues") or [])
        _emit(
            {
                "ok": False,
                "issue_count": n,
                "warning_count": 0,
                "by_formal_phase": {"syntax": n} if n else {},
                "suggested_next": open_err.get("suggested_next", []),
                "message": (open_err.get("issues") or [{}])[0].get("message", "load failed"),
            },
            args,
        )
        return 1
    env_e = validate_bundle_envelope(bundle)
    try:
        g = ir_goal_from_json(bundle)
    except (KeyError, TypeError) as ex:
        rep = build_ir_shape_error_report(ex)
        sn = suggested_next_from_report(rep)
        _emit(
            {
                "ok": False,
                "issue_count": 1,
                "warning_count": 0,
                "by_formal_phase": {"syntax": 1},
                "suggested_next": sn,
                "message": rep["issues"][0]["message"],
            },
            args,
        )
        return 1
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
    if not rep["ok"]:
        summary["suggested_next"] = suggested_next_from_report(rep)
    _emit(summary, args)
    return 0 if rep["ok"] else 1


def cmd_surface(args: argparse.Namespace) -> int:
    """Compile ``.pxir`` or ``.tq`` surface subset to canonical bundle JSON (stdout or --out)."""
    path = Path(args.file)
    raw = path.read_text(encoding="utf-8")
    try:
        if path.suffix.lower() == ".tq":
            bundle = parse_tq_source(raw, tq_path=path.resolve())
        else:
            bundle = parse_pxir_source(raw)
    except TQParseError as ex:
        extra = tq_parse_extras(ex.code)
        if getattr(args, "json", False):
            err_obj = {
                "ok": False,
                "code": ex.code,
                "message": str(ex),
                "hint": extra.get("hint"),
                "doc": extra.get("doc"),
                "suggested_next": suggested_next_for_surface_or_project_fail(),
            }
            _emit(err_obj, args, stream=sys.stderr)
        else:
            block = format_tq_cli_error(ex.code, str(ex), tq_path=path.resolve())
            sys.stderr.write(block + "\n\n")
            sys.stderr.write("Next:\n")
            _n = suggested_next_display_cap()
            for s in suggested_next_for_surface_or_project_fail()[:_n]:
                sys.stderr.write(f"  - {s}\n")
        return 1
    try:
        g = ir_goal_from_json(bundle)
    except (KeyError, TypeError) as ex:
        rep = build_ir_shape_error_report(ex)
        rep["suggested_next"] = suggested_next_from_report(rep)
        _emit(
            {"ok": False, "diagnostics": rep, "suggested_next": rep["suggested_next"]},
            args,
            stream=sys.stderr,
        )
        return 1
    rep = build_full_diagnostic_report(g)
    if not rep["ok"]:
        rep = dict(rep)
        rep["suggested_next"] = suggested_next_from_report(rep)
    if args.out:
        Path(args.out).write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    out = {"ok": rep["ok"], "diagnostics": rep, "ir_bundle": bundle}
    if not rep["ok"]:
        out["suggested_next"] = rep["suggested_next"]
    _emit(out, args)
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


def cmd_vendor(args: argparse.Namespace) -> int:
    from src.packages.errors import PackageError
    from src.packages.vendor import vendor_packages

    lock = Path(args.lock)
    try:
        dr = Path(args.deps_root) if getattr(args, "deps_root", None) else None
        rep = vendor_packages(lock, deps_root=dr)
    except PackageError as ex:
        if getattr(args, "json", False):
            sys.stderr.write(f"{ex.code}: {ex}\n")
        else:
            sys.stderr.write(format_package_cli_error(ex) + "\n")
        return 1
    if getattr(args, "json", False):
        _emit(rep, args)
    else:
        sys.stdout.write(f"OK deps_root={rep['deps_root']}\n")
        for w in rep["written"]:
            sys.stdout.write(f"  {w}\n")
    return 0


def cmd_compose(args: argparse.Namespace) -> int:
    from src.packages.compose_spec import load_bundle_json, load_compose_spec, load_fragment_json
    from src.packages.errors import PX_PKG_COMPOSE_SPEC, PackageError
    from src.packages.merge_ir import compose_bundle
    from src.packages.vendor import load_lock

    spec_path = Path(args.spec).resolve()
    compose_spec_dir = spec_path.parent
    try:
        spec = load_compose_spec(spec_path)
        root = spec_path.parent

        def _p(rel: str) -> Path:
            q = Path(rel)
            return q.resolve() if q.is_absolute() else (root / q).resolve()

        primary = load_bundle_json(_p(spec["primary"]))
        frags: List[Dict[str, Any]] = []
        for rel in spec.get("fragments") or []:
            if not isinstance(rel, str):
                raise PackageError(PX_PKG_COMPOSE_SPEC, "Each fragment path must be a string.")
            frags.append(load_fragment_json(_p(rel)))
        lib_refs: List[Dict[str, Any]] | None = None
        if spec.get("library_refs_from_lock"):
            lock_rel = spec.get("lock")
            if not isinstance(lock_rel, str) or not lock_rel.strip():
                raise PackageError(PX_PKG_COMPOSE_SPEC, "library_refs_from_lock requires string 'lock' path.")
            lock_data = load_lock(_p(lock_rel))
            lib_refs = []
            for p in lock_data.get("packages") or []:
                if isinstance(p, dict) and isinstance(p.get("name"), str) and isinstance(p.get("version"), str):
                    lib_refs.append(
                        {
                            "name": p["name"],
                            "version": p["version"],
                            "fingerprint": p.get("fingerprint") or "",
                        }
                    )
        elif spec.get("library_refs"):
            lib_refs = spec["library_refs"]
        out = compose_bundle(primary, frags, library_refs=lib_refs)
        out_path = Path(args.out).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(out, indent=2, sort_keys=True, default=str) + "\n",
            encoding="utf-8",
        )
    except PackageError as ex:
        if getattr(args, "json", False):
            sys.stderr.write(f"{ex.code}: {ex}\n")
        else:
            sys.stderr.write(format_package_cli_error(ex, compose_spec_dir=compose_spec_dir) + "\n")
        return 1
    if getattr(args, "json", False):
        _emit({"ok": True, "out": str(Path(args.out).resolve())}, args)
    else:
        sys.stdout.write(f"Wrote {args.out}\n")
    return 0


def cmd_package_fingerprint(args: argparse.Namespace) -> int:
    from src.packages.errors import PackageError
    from src.packages.fingerprint import compute_package_fingerprint

    try:
        fp = compute_package_fingerprint(Path(args.dir))
    except PackageError as ex:
        if getattr(args, "json", False):
            sys.stderr.write(f"{ex.code}: {ex}\n")
        else:
            sys.stderr.write(format_package_cli_error(ex) + "\n")
        return 1
    if getattr(args, "json", False):
        _emit({"fingerprint": fp}, args)
    else:
        sys.stdout.write(fp + "\n")
    return 0


def cmd_package_publish(args: argparse.Namespace) -> int:
    from src.packages.errors import PackageError
    from src.packages.publish_fetch import publish_package

    try:
        rep = publish_package(Path(args.dir), Path(args.registry))
    except PackageError as ex:
        if getattr(args, "json", False):
            sys.stderr.write(f"{ex.code}: {ex}\n")
        else:
            sys.stderr.write(format_package_cli_error(ex) + "\n")
        return 1
    if getattr(args, "json", False):
        _emit(rep, args)
    else:
        sys.stdout.write(f"Published {rep['name']}@{rep['version']}\n")
        sys.stdout.write(f"  fingerprint: {rep['fingerprint']}\n")
        sys.stdout.write(f"  artifact: {rep['artifact']}\n")
        sys.stdout.write(f"  registry: {rep['registry']}\n")
    return 0


def cmd_package_fetch(args: argparse.Namespace) -> int:
    from src.packages.errors import PackageError
    from src.packages.publish_fetch import fetch_package

    try:
        rep = fetch_package(args.name, args.version, args.registry, Path(args.out))
    except PackageError as ex:
        if getattr(args, "json", False):
            sys.stderr.write(f"{ex.code}: {ex}\n")
        else:
            sys.stderr.write(format_package_cli_error(ex) + "\n")
        return 1
    if getattr(args, "json", False):
        _emit(rep, args)
    else:
        sys.stdout.write(f"Fetched {rep['name']}@{rep['version']}\n")
        sys.stdout.write(f"  path: {rep['path']}\n")
        sys.stdout.write(f"  fingerprint: {rep['fingerprint']}\n")
    return 0


def cmd_package_list(args: argparse.Namespace) -> int:
    from src.packages.errors import PackageError
    from src.packages.publish_fetch import list_registry_packages

    try:
        rows = list_registry_packages(args.registry)
    except PackageError as ex:
        if getattr(args, "json", False):
            sys.stderr.write(f"{ex.code}: {ex}\n")
        else:
            sys.stderr.write(format_package_cli_error(ex) + "\n")
        return 1
    if getattr(args, "json", False):
        _emit({"packages": rows}, args)
    else:
        for r in rows:
            sys.stdout.write(f"{r.get('name')}@{r.get('version')}\t{r.get('fingerprint', '')}\n")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="torqa",
        description=(
            "TORQA toolchain. New users: docs/QUICKSTART.md\n\n"
            "Primary:  build    -> one command: validate + materialize from .json / .tq / .pxir (default engine: python_only).\n"
            "Secondary: project -> same as build with optional --source and positional file.\n"
            "           surface -> compile .tq / .pxir to IR JSON; validate -> IR .json diagnostics only.\n\n"
            "demo: flagship path (no args) or demo verify / demo benchmark / demo emit; other subcommands (run, guided, check, …) are advanced tooling. "
            "For .tq files use build or project; validate expects bundle JSON only."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
        "  torqa build examples/workspace_minimal/app.tq\n"
        "  torqa project --root . --source examples/workspace_minimal/app.tq\n"
        "  torqa surface examples/workspace_minimal/app.tq --out ir_bundle.json\n"
        "  torqa --json validate examples/core/valid_minimal_flow.json\n"
        "  torqa bundle-lint examples/core/valid_minimal_flow.json\n"
        "  torqa guided examples/core/valid_minimal_flow.json --inputs-json '{\"username\":\"a\"}'\n"
        "  torqa check examples/core/valid_minimal_flow.json --inputs-json '{\"username\":\"a\"}'\n"
        "  torqa demo                    # flagship first-trial steps (same as torqa-flagship)\n"
        "  torqa demo verify\n"
        "  torqa demo benchmark\n"
        "  torqa demo emit --out demo_out --engine-mode python_only\n"
        "  torqa surface examples/surface/minimal.pxir --out bundle.json\n"
        "  torqa project --root . --source examples/core/valid_minimal_flow.json\n"
        "  torqa language --minimal-json\n"
        "  torqa --json language --self-host-catalog\n"
        "  torqa migrate old.json --from-version 1.3 --to-version 1.4 --out new.json\n"
        "  torqa proposal-gate bundle.json\n"
        "  torqa preview-patch bundle.json mutations.json\n"
        "  torqa vendor --lock examples/package_demo/torqa.lock.json\n"
        "  torqa compose examples/package_demo/compose.json --out composed.json\n"
        "  torqa package-fingerprint examples/packages/minimal_auth\n"
        "  torqa package publish examples/packages/minimal_auth --registry ./registry\n"
        "  torqa package fetch torqa/minimal-auth 1.0.0 --registry ./registry --out ./fetched\n"
        "  torqa package list --registry ./registry\n"
        "\nSee docs/QUICKSTART.md for install and first build.\n",
    )
    p.add_argument(
        "--json",
        action="store_true",
        help="Emit compact JSON (place before subcommand: torqa --json validate FILE)",
    )

    sub = p.add_subparsers(dest="cmd", required=True)

    def add_engine_mode(ap: argparse.ArgumentParser, *, default_engine: str = "rust_preferred") -> None:
        ap.add_argument(
            "--engine-mode",
            type=str,
            default=default_engine,
            choices=["rust_preferred", "python_only", "rust_only"],
        )

    pbuild = sub.add_parser(
        "build",
        help=(
            "Primary flow: one command from spec to artifacts — torqa build <your.tq|.json|.pxir>. "
            "Validates and materializes under --out. "
            "Try: torqa build examples/workspace_minimal/app.tq — see docs/QUICKSTART.md. "
            "Default engine python_only; torqa --json build … for machine JSON."
        ),
    )
    pbuild.add_argument(
        "file",
        type=str,
        metavar="SOURCE",
        help="Path to bundle JSON, .tq, or .pxir",
    )
    pbuild.add_argument(
        "--root",
        type=str,
        default=".",
        help="Project root directory (default: current directory)",
    )
    pbuild.add_argument(
        "--out",
        type=str,
        default="generated_out",
        help="Subdirectory under --root for materialized paths (default: generated_out)",
    )
    add_engine_mode(pbuild, default_engine="python_only")
    pbuild.set_defaults(func=cmd_build)

    pp = sub.add_parser(
        "project",
        help=(
            "Same as build with optional positional file and --source. "
            "Human-readable summary by default; use torqa --json project ... for machine JSON."
        ),
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
    add_engine_mode(pp, default_engine="python_only")
    pp.set_defaults(func=cmd_project)

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

    pdemo = sub.add_parser(
        "demo",
        help=(
            "Public demo path: no subcommand prints canonical flagship steps; "
            "'verify' sanity-checks assets; 'benchmark' prints flagship compression baseline; "
            "'emit' writes a multi-surface IR bundle to --out."
        ),
    )
    demo_sub = pdemo.add_subparsers(dest="demo_action", required=False, metavar="ACTION")
    p_demo_verify = demo_sub.add_parser(
        "verify",
        help="Sanity-check flagship files, gate proof expectations, and compression baseline (CI-style)",
    )
    p_demo_verify.set_defaults(func=cmd_demo_verify)
    p_demo_benchmark = demo_sub.add_parser(
        "benchmark",
        help="Print flagship compression_baseline_report.json (human text; torqa --json demo benchmark for raw JSON)",
    )
    p_demo_benchmark.set_defaults(func=cmd_demo_benchmark)
    p_demo_emit = demo_sub.add_parser(
        "emit",
        help="Materialize a demo IR bundle to a folder (default: demo_multi_surface_flow.json -> demo_out)",
    )
    p_demo_emit.add_argument(
        "file",
        type=str,
        nargs="?",
        metavar="BUNDLE.json",
        default="examples/core/demo_multi_surface_flow.json",
        help="IR bundle JSON (default: examples/core/demo_multi_surface_flow.json)",
    )
    p_demo_emit.add_argument("--out", type=str, default="demo_out")
    add_engine_mode(p_demo_emit)
    p_demo_emit.set_defaults(func=cmd_demo_emit)
    pdemo.set_defaults(func=cmd_demo_print_path)

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
        help=(
            "Core IR language reference (builtins, handoff rules, minimal bundle) for authors and LLMs. "
            "Use --self-host-catalog for a grouped index of policy .tq bundles (debug / demos)."
        ),
    )
    plang.add_argument(
        "--minimal-json",
        action="store_true",
        help="Print only minimal valid ir_goal bundle JSON (stable sort_keys); pair with --json for one line",
    )
    plang.add_argument(
        "--self-host-catalog",
        action="store_true",
        help="Print grouped self-host .tq/bundle index + single-flow line (no language reference payload)",
    )
    plang.set_defaults(func=cmd_language)

    plint = sub.add_parser(
        "bundle-lint",
        help="IR bundle JSON: summarize issue counts by formal_phase; exit 1 if diagnostics not ok",
    )
    plint.add_argument("file", type=str, metavar="BUNDLE.json", help="IR bundle JSON path")
    plint.set_defaults(func=cmd_bundle_lint)

    pvend = sub.add_parser(
        "vendor",
        help="Materialize torqa.lock.json into .torqa/deps (legacy path or ref: path:/file:/https:; verify fingerprint)",
    )
    pvend.add_argument("--lock", type=str, default="torqa.lock.json", help="Path to torqa.lock.json")
    pvend.add_argument(
        "--deps-root",
        type=str,
        default=None,
        help="Override output root (default: <lock-parent>/.torqa/deps)",
    )
    pvend.set_defaults(func=cmd_vendor)

    pcomp = sub.add_parser(
        "compose",
        help=(
            "IR package compose: merge primary IR bundle + JSON fragments (compose.json). "
            "Not the same as TQ file include in .tq — see docs/USING_PACKAGES.md. Deterministic output."
        ),
    )
    pcomp.add_argument("spec", type=str, metavar="COMPOSE.json", help="compose.json path")
    pcomp.add_argument("--out", type=str, required=True, help="Write merged bundle JSON here")
    pcomp.set_defaults(func=cmd_compose)

    pfp = sub.add_parser(
        "package-fingerprint",
        help="Print sha256 fingerprint for a package directory (torqa.package.json + exports)",
    )
    pfp.add_argument("dir", type=str, metavar="PACKAGE_DIR", help="Package root containing torqa.package.json")
    pfp.set_defaults(func=cmd_package_fingerprint)

    ppack = sub.add_parser(
        "package",
        help="Minimal IR registry: publish | fetch | list (see docs/PACKAGE_DISTRIBUTION.md)",
    )
    pkg_sp = ppack.add_subparsers(dest="pkg_action", required=True)

    ppub = pkg_sp.add_parser(
        "publish",
        help="Pack a package directory to .tgz and update torqa-registry.json under --registry",
    )
    ppub.add_argument("dir", type=str, metavar="PACKAGE_DIR", help="Package root (contains torqa.package.json)")
    ppub.add_argument(
        "--registry",
        type=str,
        required=True,
        metavar="DIR",
        help="Registry directory (creates torqa-registry.json + .tgz artifacts here)",
    )
    ppub.set_defaults(func=cmd_package_publish)

    pfet = pkg_sp.add_parser(
        "fetch",
        help="Install name@version from a registry index (local dir or URL to torqa-registry.json)",
    )
    pfet.add_argument("name", type=str, metavar="NAME", help="Package name from manifest, e.g. torqa/minimal-auth")
    pfet.add_argument("version", type=str, metavar="VERSION", help="Exact version string (no ranges)")
    pfet.add_argument(
        "--registry",
        type=str,
        required=True,
        metavar="SPEC",
        help="Registry directory, path to torqa-registry.json, or https URL to the index JSON",
    )
    pfet.add_argument(
        "--out",
        type=str,
        required=True,
        metavar="DIR",
        help="Output directory; package is extracted to <out>/<sanitized-name-version>/",
    )
    pfet.set_defaults(func=cmd_package_fetch)

    plst = pkg_sp.add_parser("list", help="List packages in a registry index")
    plst.add_argument(
        "--registry",
        type=str,
        required=True,
        metavar="SPEC",
        help="Registry directory, path to torqa-registry.json, or https URL to the index JSON",
    )
    plst.set_defaults(func=cmd_package_list)

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
