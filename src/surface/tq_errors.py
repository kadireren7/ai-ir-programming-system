"""Shared surface parse errors (avoids import cycles between .tq parsers)."""

from __future__ import annotations

from typing import Optional


class TQParseError(ValueError):
    """Surface parse failure with a stable diagnostic code (``PX_TQ_*``)."""

    def __init__(self, code: str, message: str, *, line: Optional[int] = None) -> None:
        self.code = code
        self.line: Optional[int] = line  # 1-based source line when known
        super().__init__(message)
