# Template: external preview package (F5.2)

Scaffold for a **separate** repository that adds projection surfaces without forking core.

## Layout

```
torqa-acme-preview/
  pyproject.toml          # requires torqa >= x.y
  src/
    acme_preview/
      __init__.py         # build_extra_artifacts(ir_goal, projection_plan) -> list[artifact]
  tests/
    test_noop_hook.py
  README.md
```

## `pyproject.toml` (sketch)

```toml
[project]
name = "torqa-acme-preview"
version = "0.0.1"
dependencies = ["torqa>=1.0.0"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

## Activation

```bash
export TORQA_PROJECTION_MODULE=acme_preview:build_extra_artifacts
pytest
```

Implement `build_extra_artifacts` like `tests/fixtures/extra_projection.py` in this repo.

## Tests

One **noop** test that imports the module and asserts the hook symbol exists; optional smoke with `SystemOrchestrator` if `torqa` is installed editable.
