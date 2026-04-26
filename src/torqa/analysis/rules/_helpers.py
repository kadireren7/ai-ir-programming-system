"""Shared helpers for analysis rules (no rule-specific policy)."""

from __future__ import annotations

from typing import Dict, List, Set

from torqa.ir.canonical_ir import IRGoal, IRTransition
from torqa.semantics.ir_semantics import IRFunctionSignature, extract_ir_identifiers_from_args


def transition_writes(t: IRTransition, reg: Dict[str, IRFunctionSignature]) -> Set[str]:
    """Only registry-declared writes; arguments are never treated as writes."""
    sig = reg.get(t.effect_name)
    if sig is None:
        return set()
    return set(sig.writes) if sig.writes else set()


def transition_reads(t: IRTransition, reg: Dict[str, IRFunctionSignature]) -> Set[str]:
    sig = reg.get(t.effect_name)
    if sig is not None and sig.reads:
        return set(sig.reads)
    return extract_ir_identifiers_from_args(t.arguments)


def tq_include_chain(ir_goal: IRGoal) -> List[str]:
    sm = ir_goal.metadata.get("source_map")
    if not isinstance(sm, dict):
        return []
    raw = sm.get("tq_includes")
    if not isinstance(raw, list):
        return []
    out: List[str] = []
    for x in raw:
        if isinstance(x, str) and x.strip():
            out.append(x.strip().lower())
    return out


def surface_meta(ir_goal: IRGoal) -> Dict[str, object]:
    md = ir_goal.metadata.get("surface_meta")
    return md if isinstance(md, dict) else {}
