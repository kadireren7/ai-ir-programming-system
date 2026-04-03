#!/usr/bin/env sh
# Repo root, after: pip install -e .
set -e
cd "$(dirname "$0")/../.." || exit 1
python -m torqa demo
python -m torqa demo benchmark
