"""P20: projection contract summaries (JSON build/project only)."""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

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


def test_summarize_normalizes_metadata_and_paths():
    from src.projection.projection_contract import summarize_projection_surfaces

    arts = [
        {
            "target_language": "",
            "purpose": None,
            "files": [
                {"filename": "generated/webapp/x.ts", "content": "a"},
                {"filename": "z/b.sql", "content": " "},
            ],
        }
    ]
    out = summarize_projection_surfaces(arts, consistency_errors=[])
    assert len(out) == 1
    s = out[0]
    assert s["target_language"] == "unknown"
    assert s["purpose"] == "unknown"
    assert s["file_count"] == 2
    assert s["top_level_paths"] == ["generated", "z"]
    assert s["warnings"] == []
    assert s["consistency_ok"] is True


def test_summarize_consistency_ok_false_when_errors():
    from src.projection.projection_contract import summarize_projection_surfaces

    arts = [{"target_language": "sql", "purpose": "storage_surface", "files": []}]
    out = summarize_projection_surfaces(arts, consistency_errors=["missing something"])
    assert out[0]["consistency_ok"] is False


def test_json_build_includes_projection_surfaces(tmp_path):
    import subprocess
    import sys

    tq = REPO / "examples" / "workspace_minimal" / "app.tq"
    r = subprocess.run(
        [
            sys.executable,
            "-m",
            "src.cli.main",
            "--json",
            "build",
            str(tq),
            "--root",
            str(tmp_path),
            "--out",
            "genout",
        ],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert "projection_surfaces" in data
    surfaces = data["projection_surfaces"]
    assert isinstance(surfaces, list) and len(surfaces) >= 1
    written = set(data.get("written") or [])
    total_files = 0
    for s in surfaces:
        assert _REQUIRED_SURFACE_KEYS == set(s.keys())
        assert isinstance(s["warnings"], list)
        assert isinstance(s["top_level_paths"], list)
        assert s["consistency_ok"] is (len(data.get("consistency_errors") or []) == 0)
        total_files += int(s["file_count"])
        if s["file_count"] > 0:
            assert len(s["top_level_paths"]) >= 1
    assert total_files == len(written)


def test_top_level_paths_sorted_deterministically():
    from src.projection.projection_contract import collect_top_level_paths

    assert collect_top_level_paths(["b/a", "a/c", "b/x"]) == ["a", "b"]


def test_materialize_summary_always_has_projection_surfaces(tmp_path):
    from src.project_materialize import materialize_project, parse_stage

    tq = REPO / "examples" / "workspace_minimal" / "app.tq"
    bundle, err, _ = parse_stage(tq)
    assert err is None
    ok, summary, _ = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert "projection_surfaces" in summary
    assert isinstance(summary["projection_surfaces"], list)
    assert ok == (len(summary.get("consistency_errors") or []) == 0)
