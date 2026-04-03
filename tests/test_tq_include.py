"""`.tq` include / multi-file expansion: determinism and IR equivalence to monolithic source."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json
from src.surface.parse_tq import TQParseError, expand_tq_includes, parse_tq_source

REPO = Path(__file__).resolve().parents[1]


def _canonical_ir_goal_json(bundle: dict) -> str:
    """Compare semantic IR; drop include trace only."""
    ig = copy.deepcopy(bundle["ir_goal"])
    sm = ig.get("metadata", {}).get("source_map")
    if isinstance(sm, dict):
        sm.pop("tq_includes", None)
    return json.dumps(ig, sort_keys=True, separators=(",", ":"))


def test_expand_tq_includes_deterministic():
    path = REPO / "examples" / "torqa" / "example_include_user_login.tq"
    raw = path.read_text(encoding="utf-8")
    e1, inc1 = expand_tq_includes(raw, path)
    e2, inc2 = expand_tq_includes(raw, path)
    assert e1 == e2
    assert inc1 == inc2 == ["modules/login_inputs.tq"]


def test_parse_with_include_deterministic_ir_goal():
    path = REPO / "examples" / "torqa" / "example_include_user_login.tq"
    raw = path.read_text(encoding="utf-8")
    g1 = _canonical_ir_goal_json(parse_tq_source(raw, tq_path=path))
    g2 = _canonical_ir_goal_json(parse_tq_source(raw, tq_path=path))
    g3 = _canonical_ir_goal_json(parse_tq_source(raw, tq_path=path))
    assert g1 == g2 == g3


def test_include_ir_matches_equivalent_monolithic_inline():
    """Multi-file include produces the same ir_goal as one file without include (no tq_includes)."""
    path = REPO / "examples" / "torqa" / "example_include_user_login.tq"
    with_include = parse_tq_source(path.read_text(encoding="utf-8"), tq_path=path)
    assert with_include["ir_goal"]["metadata"]["source_map"].get("tq_includes") == ["modules/login_inputs.tq"]

    monolithic = """
module examples.demo

intent user_login
requires username, password, ip_address
forbid locked
ensures session.created
result Included fragment OK

flow:
  create session
  emit login_success
"""
    inline = parse_tq_source(monolithic)
    assert "tq_includes" not in (inline["ir_goal"]["metadata"].get("source_map") or {})

    assert _canonical_ir_goal_json(with_include) == _canonical_ir_goal_json(inline)


def test_multi_file_parse_tmp_workspace_passes_diagnostics(tmp_path):
    """Two on-disk .tq files: parent includes child; full diagnostic ok."""
    sub = tmp_path / "lib"
    sub.mkdir()
    (sub / "inputs.tq").write_text(
        "requires username, password, ip_address\nforbid locked\n",
        encoding="utf-8",
    )
    main = tmp_path / "app.tq"
    main.write_text(
        "module demo.app\n\nintent user_login\ninclude \"lib/inputs.tq\"\n\n"
        "ensures session.created\nresult OK\n\nflow:\n  create session\n  emit login_success\n",
        encoding="utf-8",
    )
    bundle = parse_tq_source(main.read_text(encoding="utf-8"), tq_path=main)
    assert bundle["ir_goal"]["metadata"]["source_map"]["tq_includes"] == ["lib/inputs.tq"]
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is True, rep


def test_two_distinct_includes_merge_in_order(tmp_path):
    sub = tmp_path / "lib"
    sub.mkdir()
    (sub / "inputs.tq").write_text(
        "requires username, password, ip_address\nforbid locked\n",
        encoding="utf-8",
    )
    (sub / "ensure.tq").write_text("ensures session.created\n", encoding="utf-8")
    main = tmp_path / "app.tq"
    main.write_text(
        "module demo\nintent x\ninclude \"lib/inputs.tq\"\ninclude \"lib/ensure.tq\"\n"
        "result OK\nflow:\n  create session\n  emit login_success\n",
        encoding="utf-8",
    )
    bundle = parse_tq_source(main.read_text(encoding="utf-8"), tq_path=main)
    assert bundle["ir_goal"]["metadata"]["source_map"]["tq_includes"] == [
        "lib/inputs.tq",
        "lib/ensure.tq",
    ]
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is True, rep


def test_include_duplicate_line_rejected(tmp_path):
    main = tmp_path / "m.tq"
    frag = tmp_path / "f.tq"
    frag.write_text("requires u, p\n", encoding="utf-8")
    main.write_text(
        'intent x\ninclude "f.tq"\ninclude "f.tq"\nrequires u, p\nresult OK\nflow:\n',
        encoding="utf-8",
    )
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(main.read_text(encoding="utf-8"), tq_path=main)
    assert ei.value.code == "PX_TQ_INCLUDE_DUPLICATE"
