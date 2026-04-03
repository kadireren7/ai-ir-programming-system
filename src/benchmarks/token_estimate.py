"""
Deterministic token **estimates** (not a real subword tokenizer).

Uses UTF-8 byte length ÷ 4, floored to at least 1 for non-empty text — a common rough
rule-of-thumb for English/prose and code. Documented in ``docs/BENCHMARK_COMPRESSION.md``.
"""

from __future__ import annotations

ESTIMATOR_ID = "utf8_bytes_div_4_v1"

# Stable description for JSON reports and tooling (do not change wording without bumping ESTIMATOR_ID).
ESTIMATOR_METHOD_EN = (
    "Token count := ceil_utf8_bytes(text) / 4 using integer arithmetic (n+3)//4; "
    "empty string -> 0; non-empty -> max(1, (utf8_byte_len + 3) // 4)."
)


def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    n = len(text.encode("utf-8"))
    return max(1, (n + 3) // 4)
