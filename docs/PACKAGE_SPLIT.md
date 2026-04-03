# Package split: core vs preview (F2)

**Ürün yönü:** [`TORQA_VISION_NORTH_STAR.md`](TORQA_VISION_NORTH_STAR.md) (ince SDK’lar aynı şemayı taşır).

Monorepo today ships one installable **`torqa`** distribution.

**Entry surfaces (F1):** interactive and scripting users invoke **`torqa`**, **`python -m torqa`**, or **`python -m src.cli.main`** (same entrypoint). Embedded tools import **`src.torqa_public`** (`parse_tq`, `load_bundle_from_path`, `validate_bundle`, `materialize_to_directory`, `build_generated_zip`) per the list below — not `compat.*` for new code.

Long-term split:

| Package | Role | Node / npm |
|---------|------|------------|
| **torqa-core** (conceptual) | Schema, diagnostics, `.tq` parse, execution bridge, `torqa project` materialize | **No** |
| **torqa-preview-web** (conceptual) | Vite/npm helpers, heavy web templates, CI web build scripts | **Yes** |

## Monorepo extras (`pyproject.toml`)

- **`[preview-web]`** — placeholder optional extra for future npm-adjacent tooling; install with `pip install -e ".[preview-web]"`. Core tests do not require Node.

## Migration phases (design)

| Phase | Move to preview package |
|-------|-------------------------|
| **1** | CI-only scripts that shell out to `npm` (`ci_build_generated_webapp.py` docs only; optional wrapper package). |
| **2** | Large string templates in `artifact_builder` / website emitter (or gate behind lazy import + extra). |

## Stable Python API (“core only”) — F2.3

Use **`src/torqa_public.py`** (documented entry points, no compat re-export spam):

1. **`parse_tq(text: str) -> dict`** — `.tq` → bundle envelope.
2. **`load_bundle_from_path(path) -> dict`** — `.json` / `.tq` / `.pxir`.
3. **`validate_bundle(bundle) -> dict`** — full diagnostic report (`ok`, `issues`, …).
4. **`materialize_to_directory(bundle, dest_root, *, engine_mode=...)`** — write artifact tree.
5. **`build_generated_zip(bundle, *, engine_mode=...)`** — in-memory zip of generated files.

Lower-level modules (`src.ir`, `src.semantics`, …) remain implementation details.

See also [`F1_F2_GAP.md`](F1_F2_GAP.md) and [`IR_VERSIONING.md`](IR_VERSIONING.md).
