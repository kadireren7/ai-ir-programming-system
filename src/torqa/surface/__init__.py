"""Optional human-facing surface syntax (subset) → canonical IR JSON."""

from torqa.surface.parse_pxir import parse_pxir_source
from torqa.surface.parse_tq import TQParseError, parse_tq_source

__all__ = ["parse_pxir_source", "parse_tq_source", "TQParseError"]
