"""
TORQA core pipeline stages (P19): parse → validate → project.

Implementations and ``materialize_project`` live in ``src.project_materialize``; this package
re-exports stage entrypoints for explicit imports.
"""

from src.project_materialize import parse_stage, project_stage, validate_stage

__all__ = ["parse_stage", "validate_stage", "project_stage"]
