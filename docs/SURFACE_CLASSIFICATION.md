# Surface classification (P18)

Short inventory: **where** work lives today vs **how** we treat it in the TORQA-first story. Paths are repo-factual; not a future layout.

| Class | Meaning | Examples in this repo |
|-------|---------|------------------------|
| **TORQA-primary** | Author- and product-facing: surface language, IR contract, examples users copy; primary loop **`torqa build`**; **official product website** source | `examples/torqa/`, `examples/torqa/templates/`, `examples/workspace_minimal/*.tq`, `examples/torqa_self/*.tq` (policy **sources**), `spec/IR_BUNDLE.schema.json`, `docs/TQ_*`, `docs/QUICKSTART.md`, [`website/`](../website/) (marketing site → `webui/static/site/`), VS Code extension under `editors/vscode-torqa/` |
| **Rust-core-support** | Engine: tight IR / eval / verification | `rust-core/` (e.g. execution/evaluator and related crates) |
| **Python-tooling-support** | CLI, loaders, codegen glue, web host, self-host bundle bridges | `src/cli/`, `torqa/`, `src/torqa_public.py`, `src/surface/`, `src/ir/`, `src/semantics/`, `src/diagnostics/`, `src/projection/`, `src/codegen/`, `src/torqa_self/` (Python readers), `webui/`, `desktop_legacy/`, `scripts/` |
| **Transitional / legacy** | Supported but not the main narrative | `compat/`, `examples/surface/*.pxir` and other **.pxir** samples, paths called out as legacy in `README.md` |

**Note:** A single path can be “TORQA-primary” for the **artifact** (e.g. a `.tq` file) while the **implementation** that reads it is Python-tooling-support. Classification here is about **product emphasis**, not deleting code.

See [ARCHITECTURE_RULES.md](ARCHITECTURE_RULES.md) for the rules that use this inventory.
