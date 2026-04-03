# Maintainer verification (F0.1)

**Global `--json`:** must appear **before** the subcommand (`torqa --json surface …`, not `torqa surface … --json`).

Copy-paste on Linux/macOS/Git Bash (from repository root):

```bash
pip install -r requirements-dev.txt
pip install -e .
python -m pytest
python -m src.cli.main --help
torqa validate examples/core/valid_minimal_flow.json
torqa bundle-lint examples/core/valid_minimal_flow.json
torqa --json surface examples/torqa/auth_login.tq | head -c 400
torqa project examples/core/valid_minimal_flow.json --root . --out _test_gen_out --engine-mode python_only
torqa project --root . --source examples/workspace_minimal/app.tq --out _f1_smoke --engine-mode python_only
torqa demo verify
cargo test --manifest-path rust-core/Cargo.toml   # optional; requires Rust toolchain + linker
```

Windows PowerShell (same intent; `torqa` yoksa `python -m src.cli.main` kullanın):

```powershell
pip install -r requirements-dev.txt
pip install -e .
python -m pytest
python -m src.cli.main --help
python -m src.cli.main validate examples/core/valid_minimal_flow.json
python -m src.cli.main bundle-lint examples/core/valid_minimal_flow.json
python -m src.cli.main --json surface examples/torqa/auth_login.tq
python -m src.cli.main project --root . --source examples/core/valid_minimal_flow.json --out _maintainer_gen --engine-mode python_only
python -m src.cli.main project --root . --source examples/workspace_minimal/app.tq --out _f1_smoke --engine-mode python_only
python -m src.cli.main demo verify
```

CI runs `pytest`, `cargo test`, and the Vite smoke script (Linux) per `.github/workflows/ci.yml`.
