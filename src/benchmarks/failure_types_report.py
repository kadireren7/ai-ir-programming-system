"""
Scan representative invalid fixtures and classify failures → ``reports/failure_types.json``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from src.diagnostics.failure_buckets import (
    BUCKET_NONE,
    BUCKET_SEMANTIC,
    BUCKET_STRUCTURE,
    BUCKET_SYNTAX,
    classify_from_diagnostic_issue,
    classify_parse_stage_exception,
)

REPORT_SCHEMA_VERSION = 1
REPORT_ID = "failure_types"


def _load_stress_manifest_paths(repo_root: Path) -> List[Tuple[str, Path]]:
    man = repo_root / "examples" / "validation_stress" / "manifest.json"
    if not man.is_file():
        return []
    data = json.loads(man.read_text(encoding="utf-8"))
    base = man.parent.resolve()
    out: List[Tuple[str, Path]] = []
    for c in data.get("cases") or []:
        cid = str(c.get("id", ""))
        rel = str(c.get("path", ""))
        out.append((cid, (base / rel).resolve()))
    return out


def _gate_invalid_sources(gate_dir: Path) -> List[Path]:
    if not gate_dir.is_dir():
        return []
    paths: List[Path] = []
    for p in sorted(gate_dir.iterdir()):
        if p.suffix.lower() in (".json", ".tq") and p.name != "manifest.json":
            paths.append(p.resolve())
    # valid flagship .tq (control)
    flagship = gate_dir.parent / "app.tq"
    if flagship.is_file():
        paths.append(flagship.resolve())
    return paths


def analyze_source_path(path: Path) -> Dict[str, Any]:
    """Run parse + validate; return bucket + stage + primary signal."""
    from src.project_materialize import parse_stage, validate_stage

    path = path.resolve()
    bundle, perr, _pinfo = parse_stage(path)
    if perr is not None:
        return {
            "reject_stage": "parse",
            "failure_bucket": classify_parse_stage_exception(perr),
            "primary_code": getattr(perr, "code", type(perr).__name__),
            "primary_phase": None,
            "primary_formal_phase": None,
            "detail": str(perr)[:500],
        }

    assert bundle is not None
    vr = validate_stage(bundle)
    if vr.ok:
        return {
            "reject_stage": None,
            "failure_bucket": BUCKET_NONE,
            "primary_code": None,
            "primary_phase": None,
            "primary_formal_phase": None,
            "detail": None,
        }

    diag = (vr.failure_payload or {}).get("diagnostics") or {}
    issues = list(diag.get("issues") or [])
    first = issues[0] if issues else {}
    bucket = classify_from_diagnostic_issue(first) if first else BUCKET_STRUCTURE
    return {
        "reject_stage": "validate",
        "failure_bucket": bucket,
        "primary_code": first.get("code"),
        "primary_phase": first.get("phase"),
        "primary_formal_phase": first.get("formal_phase"),
        "detail": str(first.get("message", ""))[:500],
    }


def run_failure_types_report(repo_root: Path) -> Dict[str, Any]:
    root = repo_root.resolve()
    rows: List[Dict[str, Any]] = []
    seen: Set[Path] = set()

    for case_id, p in _load_stress_manifest_paths(root):
        if not p.is_file() or p in seen:
            continue
        seen.add(p)
        rel = str(p.relative_to(root)).replace("\\", "/")
        a = analyze_source_path(p)
        rows.append(
            {
                "source_id": case_id,
                "group": "validation_stress",
                "path": rel,
                **a,
            }
        )

    gate_dir = root / "examples" / "benchmark_flagship" / "gate_invalid"
    for p in _gate_invalid_sources(gate_dir):
        if p in seen:
            continue
        seen.add(p)
        rel = str(p.relative_to(root)).replace("\\", "/")
        a = analyze_source_path(p)
        sid = p.stem
        rows.append(
            {
                "source_id": sid,
                "group": "benchmark_flagship_gate_invalid",
                "path": rel,
                **a,
            }
        )

    # Summary counts (accepted = no failure bucket)
    counts = {BUCKET_SYNTAX: 0, BUCKET_STRUCTURE: 0, BUCKET_SEMANTIC: 0, "accepted": 0}
    for r in rows:
        b = r.get("failure_bucket")
        if b is None:
            counts["accepted"] += 1
        elif b in counts:
            counts[b] += 1

    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "report_id": REPORT_ID,
        "classification": {
            "syntax_failure": "Surface / wire parse: .tq header & flow, JSON bundle decode, schema surface rules.",
            "structure_failure": "Bundle envelope, IR shape, identifiers, transitions, policy/handoff contract, determinism collisions.",
            "semantic_failure": "IR meaning: unknown functions/effects, arity/types, forbid guarantees, comparisons.",
        },
        "summary": {
            "sources_total": len(rows),
            "syntax_failure_count": counts[BUCKET_SYNTAX],
            "structure_failure_count": counts[BUCKET_STRUCTURE],
            "semantic_failure_count": counts[BUCKET_SEMANTIC],
            "accepted_count": counts["accepted"],
        },
        "sources": sorted(rows, key=lambda x: (x["group"], x["path"])),
    }


def failure_types_to_canonical_json(report: Dict[str, Any]) -> str:
    return json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def write_failure_types_report(repo_root: Path, out_path: Path) -> Dict[str, Any]:
    report = run_failure_types_report(repo_root)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(failure_types_to_canonical_json(report), encoding="utf-8")
    return report
