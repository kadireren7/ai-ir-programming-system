"""``torqa validate`` — full trust pipeline with stable text for scripting and optional ``--json``."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

from torqa.policy import build_policy_report
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from torqa.surface.parse_tq import TQParseError
from torqa.ir.canonical_ir import validate_ir
from torqa.cli.cli_printers import cli_json, cli_quiet, print_banner, print_trust_scoring_block
from torqa.cli.io import bundle_jobs, goal_from_bundle, load_input

_MSG_VALIDATE_HANDOFF_OK = "Handoff: validated artifact ready for external handoff."
_MSG_VALIDATE_BLOCKED = "Guardrail: spec blocked before execution."


def _print_validate_header(input_type: str, path: Path) -> None:
    print(f"Input type: {input_type}")
    print(f"File: {path}")


def cmd_validate(args: Any) -> int:
    path: Path = args.file
    profile = getattr(args, "profile", None) or "default"
    json_mode = cli_json(args)

    if not path.is_file():
        if json_mode:
            print(
                json.dumps(
                    {"schema": "torqa.cli.validate.v1", "ok": False, "error": "not a file", "path": str(path)},
                    indent=2,
                )
            )
        else:
            print(f"torqa validate: not a file: {path}", file=sys.stderr)
        return 1

    integration_source = getattr(args, "source", None) or None
    bundle, err, input_type = load_input(path, integration_source=integration_source)
    if input_type == "unknown":
        if json_mode:
            print(
                json.dumps(
                    {
                        "schema": "torqa.cli.validate.v1",
                        "ok": False,
                        "path": str(path.resolve()),
                        "profile": profile,
                        "error": str(err),
                        "bundles": [],
                    },
                    indent=2,
                    ensure_ascii=False,
                )
            )
        else:
            print(f"torqa validate: {err}", file=sys.stderr)
        return 1

    if err is not None:
        if json_mode:
            payload: Dict[str, Any] = {
                "schema": "torqa.cli.validate.v1",
                "ok": False,
                "path": str(path.resolve()),
                "profile": profile,
                "bundles": [
                    {
                        "suffix": "",
                        "load": "fail",
                        "error": str(err) if not isinstance(err, TQParseError) else err.code,
                        "message": str(err),
                    }
                ],
            }
            if isinstance(err, TQParseError):
                payload["bundles"][0]["line"] = err.line
            print(json.dumps(payload, indent=2, ensure_ascii=False))
        else:
            _print_validate_header(input_type, path)
            print()
            if isinstance(err, TQParseError):
                print("Parse: FAIL")
                print(f"Error: {err.code}")
                if err.line is not None:
                    print(f"Line: {err.line}")
                print(f"Message: {err}")
            elif input_type == "json":
                print("Load: FAIL")
                print(f"Error: {err}")
            else:
                print("Load: FAIL")
                print(f"Error: {err}")
            print()
            print("Result: FAIL")
            print(_MSG_VALIDATE_BLOCKED)
        return 1

    assert bundle is not None
    jobs = bundle_jobs(path, bundle, input_type)
    if input_type == "json_batch":
        type_lbl = f"json (batch: {len(jobs)} bundles in file)"
    else:
        type_lbl = input_type

    load_word = "Parse" if input_type == "tq" else "Load"
    any_fail = False
    batch_warn_exit = False
    json_bundles: List[Dict[str, Any]] = []

    if json_mode:
        for suffix, one_bundle in jobs:
            gh = f"{path.resolve()}{suffix}"
            bdoc = _evaluate_one_bundle_json(
                suffix=suffix,
                path_hint=gh,
                one_bundle=one_bundle,
                profile=profile,
                load_word=load_word,
                fail_on_warning=bool(getattr(args, "fail_on_warning", False)),
            )
            json_bundles.append(bdoc)
            if bdoc.get("result") != "pass":
                any_fail = True
            if bdoc.get("warn_exit"):
                batch_warn_exit = True
        print(
            json.dumps(
                {
                    "schema": "torqa.cli.validate.v1",
                    "ok": not any_fail and not batch_warn_exit,
                    "path": str(path.resolve()),
                    "profile": profile,
                    "input_type": type_lbl,
                    "bundles": json_bundles,
                },
                indent=2,
                ensure_ascii=False,
            )
        )
        return 1 if (any_fail or batch_warn_exit) else 0

    if not cli_quiet(args):
        print_banner("torqa validate", f"{path.resolve()} · profile {profile}", args=args)

    for idx, (suffix, one_bundle) in enumerate(jobs):
        if idx == 0:
            print(f"Input type: {type_lbl}")
            print(f"File: {path}")
            print()
        elif len(jobs) > 1:
            print(f"\n--- Bundle {idx + 1}/{len(jobs)} ({path.name}{suffix}) ---\n")

        gh = f"{path.resolve()}{suffix}"
        goal, gerr = goal_from_bundle(one_bundle, path_hint=gh)
        if gerr is not None:
            print("IR payload: FAIL")
            print(f"Error: {gerr}")
            print()
            print("Result: FAIL")
            print(_MSG_VALIDATE_BLOCKED)
            any_fail = True
            continue

        print(f"{load_word}: OK")

        struct = validate_ir(goal)
        if struct:
            print("Structural validation: FAIL")
            for line in struct:
                print(f"  - {line}")
            print()
            print("Result: FAIL")
            print(_MSG_VALIDATE_BLOCKED)
            any_fail = True
            continue

        print("Structural validation: PASS")

        reg = default_ir_function_registry()
        report = build_ir_semantic_report(goal, reg)
        sem_ok = bool(report.get("semantic_ok"))
        logic_ok = bool(report.get("logic_ok"))

        errs = list(report.get("errors") or [])
        warns = list(report.get("warnings") or [])

        print(f"Semantic validation: {'PASS' if sem_ok else 'FAIL'}")
        print(f"Logic validation: {'PASS' if logic_ok else 'FAIL'}")
        if errs:
            print("Semantic errors:")
            for e in errs:
                print(f"  - {e}")
        if warns:
            print("Warnings:")
            for w in warns:
                print(f"  - {w}")

        print()
        if not sem_ok or not logic_ok:
            print("Result: FAIL")
            print(_MSG_VALIDATE_BLOCKED)
            any_fail = True
            continue

        policy_rep = build_policy_report(goal, profile=profile)
        pok = bool(policy_rep["policy_ok"])
        print(f"Trust profile: {policy_rep['trust_profile']}")
        print(f"Policy validation: {'PASS' if pok else 'FAIL'}")
        print(f"Review required: {'yes' if policy_rep['review_required'] else 'no'}")
        if policy_rep["errors"]:
            print("Policy errors:")
            for e in policy_rep["errors"]:
                print(f"  - {e}")
        if policy_rep["warnings"]:
            print("Policy warnings:")
            for w in policy_rep["warnings"]:
                print(f"  - {w}")
        rl = str(policy_rep.get("risk_level", "low"))
        print(f"Risk level: {rl}")
        pr_reasons = list(policy_rep.get("reasons") or [])
        if pr_reasons:
            print("Why:")
            for line in pr_reasons:
                print(f"  - {line}")
        print_trust_scoring_block(policy_rep)
        print()
        if pok:
            print("Result: PASS")
            print(_MSG_VALIDATE_HANDOFF_OK)
            if getattr(args, "fail_on_warning", False):
                sem_w = list(report.get("warnings") or [])
                pol_w = list(policy_rep.get("warnings") or [])
                if sem_w or pol_w:
                    print(
                        "torqa validate: semantic or policy warnings present (fail-on-warning); exiting with status 1.",
                        file=sys.stderr,
                    )
                    batch_warn_exit = True
                    any_fail = True
            continue

        print("Result: FAIL")
        print(_MSG_VALIDATE_BLOCKED)
        any_fail = True

    if batch_warn_exit:
        return 1
    return 1 if any_fail else 0


def _evaluate_one_bundle_json(
    *,
    suffix: str,
    path_hint: str,
    one_bundle: Dict[str, Any],
    profile: str,
    load_word: str,
    fail_on_warning: bool,
) -> Dict[str, Any]:
    goal, gerr = goal_from_bundle(one_bundle, path_hint=path_hint)
    if gerr is not None:
        return {
            "suffix": suffix,
            "load": "ok",
            "ir_payload": "fail",
            "error": gerr,
            "result": "fail",
        }
    struct = validate_ir(goal)
    if struct:
        return {
            "suffix": suffix,
            "load": "ok",
            "ir_payload": "ok",
            "structural": "fail",
            "errors": struct,
            "result": "fail",
        }
    reg = default_ir_function_registry()
    report = build_ir_semantic_report(goal, reg)
    sem_ok = bool(report.get("semantic_ok"))
    logic_ok = bool(report.get("logic_ok"))
    out: Dict[str, Any] = {
        "suffix": suffix,
        "load_word": load_word,
        "load": "ok",
        "ir_payload": "ok",
        "structural": "pass",
        "semantic_ok": sem_ok,
        "logic_ok": logic_ok,
        "semantic_errors": list(report.get("errors") or []),
        "semantic_warnings": list(report.get("warnings") or []),
    }
    if not sem_ok or not logic_ok:
        out["result"] = "fail"
        return out
    policy_rep = build_policy_report(goal, profile=profile)
    out["policy"] = {
        "trust_profile": policy_rep.get("trust_profile"),
        "policy_ok": bool(policy_rep["policy_ok"]),
        "review_required": bool(policy_rep.get("review_required")),
        "risk_level": str(policy_rep.get("risk_level", "low")),
        "errors": list(policy_rep.get("errors") or []),
        "warnings": list(policy_rep.get("warnings") or []),
        "reasons": list(policy_rep.get("reasons") or []),
        "trust_score": policy_rep.get("trust_score"),
        "trust_score_max": policy_rep.get("trust_score_max"),
        "confidence": policy_rep.get("confidence"),
        "trust_decision": policy_rep.get("trust_decision"),
        "min_trust_score": policy_rep.get("min_trust_score"),
        "score_factors": policy_rep.get("score_factors"),
        "top_factors": policy_rep.get("top_factors"),
        "score_rationale": policy_rep.get("score_rationale"),
        "trust_scoring_issues": list(policy_rep.get("trust_scoring_issues") or []),
    }
    pok = bool(policy_rep["policy_ok"])
    warn_exit = False
    if pok and fail_on_warning:
        if out["semantic_warnings"] or policy_rep.get("warnings"):
            warn_exit = True
    out["result"] = "pass" if pok and not warn_exit else "fail"
    out["warn_exit"] = warn_exit
    return out
