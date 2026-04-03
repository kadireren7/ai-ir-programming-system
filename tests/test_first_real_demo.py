"""P25: flagship `examples/torqa_demo_site` end-to-end build and webapp output."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from src.codegen.artifact_builder import WEBAPP_CORE_RELATIVE_PATHS
from src.project_materialize import materialize_project, parse_stage

REPO = Path(__file__).resolve().parents[1]
DEMO_TQ = REPO / "examples" / "torqa_demo_site" / "app.tq"


def test_demo_tq_parses_and_materializes(tmp_path):
    assert DEMO_TQ.is_file()
    bundle, err, _ = parse_stage(DEMO_TQ)
    assert err is None and bundle is not None
    ok, summary, written = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is True, summary
    web = sorted(p for p in written if p.startswith("generated/webapp/"))
    assert web, "expected webapp paths in written list"
    for rel in WEBAPP_CORE_RELATIVE_PATHS:
        assert rel in written, f"missing {rel}"
    assert "generated/webapp/src/server_stub.ts" in written
    assert (tmp_path / "generated" / "webapp" / "src" / "App.tsx").is_file()
    assert "projection_surfaces" in summary
    assert summary.get("local_webapp")


def test_demo_torqa_build_cli_succeeds(tmp_path):
    r = subprocess.run(
        [
            sys.executable,
            "-m",
            "src.cli.main",
            "--json",
            "build",
            str(DEMO_TQ),
            "--root",
            str(tmp_path),
            "--out",
            "demo_out",
            "--engine-mode",
            "python_only",
        ],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr + r.stdout
    data = json.loads(r.stdout)
    assert data.get("ok") is True
    written = set(data.get("written") or [])
    assert "generated/webapp/package.json" in written
    assert "generated/webapp/src/server_stub.ts" in written
    root = tmp_path / "demo_out" / "generated" / "webapp"
    assert (root / "index.html").is_file()
    assert (root / "package.json").is_file()
