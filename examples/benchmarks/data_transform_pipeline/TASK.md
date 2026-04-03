# Benchmark task: Data transform pipeline

## Natural language description

Records arrive from a source shape (e.g. CSV row or JSON object with stringly fields). A pipeline normalizes them: trim strings, parse dates into a canonical format, coerce numeric fields, and drop or quarantine rows that fail parsing. Valid rows are written to a **staging** representation; invalid rows are collected with error codes. The pipeline runs as a bounded sequence of steps; order matters (e.g. parse date after trim).

## Expected behavior summary

- **Preconditions:** Input must be classifiable as “row-like” with a defined schema; malformed container is rejected as a batch error.
- **Step order:** Normalization steps apply in the documented order; changing order is out of spec unless explicitly allowed.
- **Invalid data:** Rows that fail a step do not appear in staging; they appear in a **reject** list with at least one machine-readable reason per row.
- **Valid data:** All staged rows satisfy the target schema (types and required fields).
- **Idempotency:** Re-running the same valid input produces the same staging output (no duplicate staging rows for the same logical input key, if a key is defined in your comparator).
