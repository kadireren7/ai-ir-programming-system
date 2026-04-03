"""P18: lightweight guard that primary user-facing docs still center TORQA + torqa build."""

from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

# Short checks only — not full paragraph fixtures.
_DOCS = (
    REPO / "README.md",
    REPO / "STATUS.md",
    REPO / "docs" / "QUICKSTART.md",
    REPO / "docs" / "FIRST_PROJECT.md",
    REPO / "docs" / "ARCHITECTURE_RULES.md",
    REPO / "docs" / "SURFACE_CLASSIFICATION.md",
)


def _text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def test_user_facing_docs_mention_torqa_brand():
    for path in _DOCS:
        text = _text(path)
        assert re.search(r"\bTORQA\b", text), f"{path.name} should mention TORQA (product name)"


def test_user_facing_docs_mention_torqa_build_flow():
    for path in _DOCS:
        text = _text(path).lower()
        assert "torqa build" in text, f"{path.name} should mention torqa build (primary flow)"


def test_architecture_rules_link_self_host_lock():
    rules = _text(REPO / "docs" / "ARCHITECTURE_RULES.md")
    assert "SELF_HOST_MAP" in rules
    assert "P17.1" in rules or "P17" in rules
