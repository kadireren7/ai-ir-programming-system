# Engine routing

Modes: `rust_preferred`, `python_only`, `rust_only`.

- **rust_preferred**: Rust bridge first; on failure, Python fallback (see `engine_routing.py`).
- Bridge timeout: `TORQA_RUST_TIMEOUT_SEC` (default 120).
- Parity packaging: `build_engine_parity_report` wraps `compare_rust_and_python_pipeline`.

Rust binary: `rust-core` `bridge` via `cargo run --bin bridge`.
