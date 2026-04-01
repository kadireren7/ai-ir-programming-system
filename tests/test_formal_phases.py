from src.diagnostics.formal_phases import formal_phase_for_issue
from src.diagnostics.codes import (
    PX_HANDOFF,
    PX_IR_CONDITION_ID_COLLISION,
    PX_IR_GOAL_EMPTY,
    PX_PARSE_FAILED,
)


def test_formal_phase_syntax():
    assert formal_phase_for_issue(PX_PARSE_FAILED, "structural") == "syntax"


def test_formal_phase_wellformed_collision():
    assert formal_phase_for_issue(PX_IR_CONDITION_ID_COLLISION, "structural") == "wellformed"


def test_formal_phase_kind_type_goal():
    assert formal_phase_for_issue(PX_IR_GOAL_EMPTY, "structural") == "kind_type"


def test_formal_phase_envelope_is_policy():
    assert formal_phase_for_issue("PX_UNSPECIFIED", "envelope") == "policy"


def test_formal_phase_handoff_is_policy():
    assert formal_phase_for_issue(PX_HANDOFF, "handoff") == "policy"
