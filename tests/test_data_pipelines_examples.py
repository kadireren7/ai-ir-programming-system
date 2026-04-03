"""examples/data_pipelines/*.tq — structured pipeline starters parse, validate, materialize."""

from pathlib import Path

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json
from src.project_materialize import materialize_project
from src.surface.parse_tq import parse_tq_source

REPO = Path(__file__).resolve().parents[1]


def test_data_pipelines_examples_parse_validate_and_materialize(tmp_path: Path) -> None:
    root = REPO / "examples" / "data_pipelines"
    tq_files = sorted(root.glob("*.tq"))
    assert tq_files, "expected .tq under examples/data_pipelines"
    for path in tq_files:
        rel = path.relative_to(REPO).as_posix()
        bundle = parse_tq_source(path.read_text(encoding="utf-8"), tq_path=path)
        g = ir_goal_from_json(bundle)
        rep = build_full_diagnostic_report(g)
        assert rep["ok"] is True, f"{rel}: {rep}"
        out_dir = tmp_path / path.stem
        ok, summary, _written = materialize_project(bundle, out_dir, engine_mode="python_only")
        assert ok is True, f"{rel}: {summary}"
