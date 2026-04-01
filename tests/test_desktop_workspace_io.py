import json
import tempfile
from pathlib import Path

from desktop.workspace_io import write_flow_project


def test_write_flow_project_creates_bundle():
    root = Path(__file__).resolve().parents[1]
    sample = json.loads((root / "examples" / "core" / "valid_minimal_flow.json").read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory() as d:
        r = write_flow_project(d, sample)
        assert r["ok"] is True
        assert Path(r["bundle"]).is_file()
        roundtrip = json.loads(Path(r["bundle"]).read_text(encoding="utf-8"))
        assert "ir_goal" in roundtrip


def test_write_flow_project_rejects_bad_workspace():
    r = write_flow_project("/nonexistent/path/that/does/not/exist", {"ir_goal": {}})
    assert r["ok"] is False
