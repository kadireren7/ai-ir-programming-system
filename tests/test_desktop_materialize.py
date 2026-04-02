import json
from pathlib import Path

from desktop.workspace_io import materialize_bundle_to_workspace

REPO = Path(__file__).resolve().parents[1]


def test_materialize_bundle_to_workspace_writes_files(tmp_path):
    bundle = json.loads((REPO / "examples" / "core" / "valid_minimal_flow.json").read_text(encoding="utf-8"))
    r = materialize_bundle_to_workspace(str(tmp_path), bundle, out_subdir="g", engine_mode="python_only")
    assert r["ok"] is True
    assert r["file_count"] >= 1
    assert Path(r["written_under"]).is_dir()
