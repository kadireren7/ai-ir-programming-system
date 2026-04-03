"""P21: webapp projection layout, determinism, and P20 projection_surfaces contract."""

from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MINIMAL_TQ = REPO / "examples" / "workspace_minimal" / "app.tq"

_REQUIRED_SURFACE_KEYS = frozenset(
    {
        "target_language",
        "purpose",
        "file_count",
        "top_level_paths",
        "warnings",
        "consistency_ok",
    }
)


def test_minimal_tq_produces_required_webapp_files(tmp_path):
    from src.codegen.artifact_builder import WEBAPP_CORE_RELATIVE_PATHS
    from src.project_materialize import materialize_project, parse_stage

    bundle, err, _ = parse_stage(MINIMAL_TQ)
    assert err is None
    ok, summary, _written = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is True
    for rel in WEBAPP_CORE_RELATIVE_PATHS:
        p = tmp_path / rel
        assert p.is_file(), f"missing {rel}"
    assert summary.get("local_webapp")


def test_webapp_paths_deterministic_across_materialize_runs(tmp_path):
    from src.project_materialize import materialize_project, parse_stage

    bundle, err, _ = parse_stage(MINIMAL_TQ)
    assert err is None
    root_a = tmp_path / "run_a"
    root_b = tmp_path / "run_b"
    root_a.mkdir()
    root_b.mkdir()
    ok_a, _, w_a = materialize_project(bundle, root_a, engine_mode="python_only")
    ok_b, _, w_b = materialize_project(bundle, root_b, engine_mode="python_only")
    assert ok_a and ok_b
    web_a = sorted(p for p in w_a if p.startswith("generated/webapp/"))
    web_b = sorted(p for p in w_b if p.startswith("generated/webapp/"))
    assert web_a == web_b
    assert web_a


def test_projection_surfaces_remain_contract_compliant(tmp_path):
    from src.project_materialize import materialize_project, parse_stage

    bundle, err, _ = parse_stage(MINIMAL_TQ)
    assert err is None
    ok, summary, written = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is True
    surfaces = summary.get("projection_surfaces") or []
    assert isinstance(surfaces, list) and len(surfaces) >= 1
    total_files = 0
    frontend = None
    for s in surfaces:
        assert _REQUIRED_SURFACE_KEYS == set(s.keys())
        assert isinstance(s["warnings"], list)
        assert isinstance(s["top_level_paths"], list)
        assert s["consistency_ok"] is (len(summary.get("consistency_errors") or []) == 0)
        total_files += int(s["file_count"])
        if s.get("purpose") == "frontend_surface":
            frontend = s
    assert total_files == len(written)
    assert frontend is not None
    assert frontend["target_language"] == "typescript"
    assert frontend["file_count"] > 0
    assert "generated" in frontend["top_level_paths"]
    web_written = sorted(p for p in written if p.startswith("generated/webapp/"))
    assert frontend["file_count"] == len(web_written)
