# packages/

Reserved for **thin official SDKs** (same schema, minimal surface): e.g. future `@torqa/*` on npm, PyPI `torqa` split, Rust crate publish path.

**Direction:** [`docs/TORQA_VISION_NORTH_STAR.md`](../docs/TORQA_VISION_NORTH_STAR.md) §4 and §7. **Split plan:** [`docs/PACKAGE_SPLIT.md`](../docs/PACKAGE_SPLIT.md).

Today the monorepo ships **`torqa`** from repo root (`pyproject.toml`).

- **`js/torqa-types/`** — minimal **`@torqa/types-stub`** `package.json` + README (JSON Schema yolu; ileride yayınlanabilir tipler).
