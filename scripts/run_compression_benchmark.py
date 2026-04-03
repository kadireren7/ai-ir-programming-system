#!/usr/bin/env python3
"""Wrapper: run from repo root so ``src`` is importable, or use ``torqa-compression-bench``."""
from __future__ import annotations

import sys
from pathlib import Path

# Repo root (parent of scripts/)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.benchmarks.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
