import json
from pathlib import Path

from src.codegen.artifact_builder import generate_stub_artifact
from src.ir.canonical_ir import ir_goal_from_json
from src.projection.projection_strategy import ProjectionTarget

REPO = Path(__file__).resolve().parents[1]


def test_kotlin_stub_artifact_path():
    raw = json.loads((REPO / "examples/core/valid_minimal_flow.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    t = ProjectionTarget("kotlin", "core_runtime", 0.5, ["test"])
    art = generate_stub_artifact(g, t)
    names = {f["filename"] for f in art.get("files", [])}
    assert "generated/kotlin/Main.kt" in names
    body = next(f["content"] for f in art["files"] if f["filename"].endswith("Main.kt"))
    assert "fun main()" in body
    assert "MinimalDemoFlow" in body
