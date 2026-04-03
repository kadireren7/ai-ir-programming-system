"""Projection materialization: deterministic tree and bytes for the same validated bundle."""

from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def test_write_artifacts_invariant_to_artifact_block_order(tmp_path: Path) -> None:
    from src.project_materialize import (
        _write_artifacts,
        compute_projection_output_digest,
    )

    block_a = {
        "target_language": "typescript",
        "purpose": "frontend_surface",
        "files": [
            {"filename": "generated/webapp/second.txt", "content": "2"},
            {"filename": "generated/webapp/first.txt", "content": "1"},
        ],
    }
    block_b = {
        "target_language": "python",
        "purpose": "stub",
        "files": [{"filename": "generated/py/stub.txt", "content": "stub"}],
    }
    forward = [block_a, block_b]
    backward = [block_b, block_a]

    r1 = tmp_path / "fwd"
    r2 = tmp_path / "rev"
    r1.mkdir()
    r2.mkdir()
    w1 = _write_artifacts(forward, r1)
    w2 = _write_artifacts(backward, r2)
    assert w1 == w2
    assert compute_projection_output_digest(r1, w1) == compute_projection_output_digest(r2, w2)


def test_materialize_same_bundle_identical_digest_across_runs(tmp_path: Path) -> None:
    from src.project_materialize import (
        compute_projection_output_digest,
        materialize_project,
        parse_stage,
    )

    tq = REPO / "examples" / "torqa" / "templates" / "login_flow.tq"
    bundle, err, _ = parse_stage(tq)
    assert err is None

    digests: list[str] = []
    written_ref: list[str] | None = None
    for i in range(3):
        root = tmp_path / f"run_{i}"
        root.mkdir()
        ok, summary, written = materialize_project(bundle, root, engine_mode="python_only")
        assert ok is True, summary
        if written_ref is None:
            written_ref = list(written)
        else:
            assert written == written_ref
        digests.append(compute_projection_output_digest(root, written))

    assert digests[0] == digests[1] == digests[2]


def test_materialize_minimal_workspace_stable_structure(tmp_path: Path) -> None:
    from src.codegen.artifact_builder import WEBAPP_CORE_RELATIVE_PATHS
    from src.project_materialize import materialize_project, parse_stage

    tq = REPO / "examples" / "workspace_minimal" / "app.tq"
    bundle, err, _ = parse_stage(tq)
    assert err is None
    roots = [tmp_path / "a", tmp_path / "b"]
    paths_sets: list[set[str]] = []
    for r in roots:
        r.mkdir()
        ok, _, written = materialize_project(bundle, r, engine_mode="python_only")
        assert ok
        paths_sets.append(set(written))
        for rel in WEBAPP_CORE_RELATIVE_PATHS:
            assert (r / rel).is_file(), rel
    assert paths_sets[0] == paths_sets[1]
