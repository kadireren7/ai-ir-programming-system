# Structured data pipeline examples (`.tq`)

Starter intents for **ETL-shaped** flows: normalize → map → filter. Each file parses as **tq_v1**; treat `requires` as the **logical inputs** your pipeline IR will reference (row handles, schema ids, rule sets).

Use these as copy-paste bases, then extend **`preconditions` / `postconditions` / `transitions`** in IR (or future surface features) to encode ordering, quarantine, and staging guarantees.

| Example | Intent |
|---------|--------|
| [`normalize_input.tq`](normalize_input.tq) | Clean incoming row-like data (trim, types, canonical formats) before downstream steps. |
| [`map_fields.tq`](map_fields.tq) | Project source fields into a target schema (rename, reshape, derived columns). |
| [`filter_conditions.tq`](filter_conditions.tq) | Keep or drop records by declarative conditions; invalid rows to a reject path. |

**Surface note:** `password` is required in `requires` by the current `.tq` parser; rename or alias in your domain model as needed. See [`docs/TQ_AUTHOR_CHEATSHEET.md`](../../docs/TQ_AUTHOR_CHEATSHEET.md).

Related benchmark narrative: [`examples/benchmarks/data_transform_pipeline/`](../benchmarks/data_transform_pipeline/TASK.md).
