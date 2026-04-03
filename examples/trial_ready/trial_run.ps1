# Repo root, after: pip install -e .
$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "..\.."))
python -m torqa demo
python -m torqa demo benchmark
