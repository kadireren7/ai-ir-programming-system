import json
import os
from pathlib import Path

import pytest

from src.ir.canonical_ir import ir_goal_from_json
from src.orchestrator.system_orchestrator import SystemOrchestrator
from src.projection.projection_strategy import ProjectionContext

REPO = Path(__file__).resolve().parents[1]


@pytest.fixture
def hook_env():
    old = os.environ.get("TORQA_PROJECTION_MODULE")
    os.environ["TORQA_PROJECTION_MODULE"] = "tests.fixtures.extra_projection:build_extra_artifacts"
    yield
    if old is None:
        os.environ.pop("TORQA_PROJECTION_MODULE", None)
    else:
        os.environ["TORQA_PROJECTION_MODULE"] = old


def test_merge_extra_projection_artifact(hook_env):
    raw = json.loads((REPO / "examples" / "core" / "valid_minimal_flow.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    orch = SystemOrchestrator(g, context=ProjectionContext(), engine_mode="python_only")
    out = orch.run()
    arts = out.get("artifacts") or []
    names = {f.get("filename") for a in arts for f in (a.get("files") or [])}
    assert "generated/ecosystem/hook_smoke.txt" in names
