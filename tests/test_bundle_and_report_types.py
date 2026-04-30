"""Unit tests for Step 1 foundational types: bundle, adapter protocol, report."""

from __future__ import annotations

from torqa.bundle.model import ExternalConnection, WorkflowBundle, WorkflowEdge, WorkflowNode
from torqa.integrations.base import SourceAdapter
from torqa.report.contract import Evidence, Finding, GovernanceReport


# ---------------------------------------------------------------------------
# WorkflowNode
# ---------------------------------------------------------------------------

def test_workflow_node_defaults():
    node = WorkflowNode(
        node_id="n1",
        name="HTTP Request",
        type="action",
        platform_type="n8n-nodes-base.httpRequest",
        parameters={"url": "https://example.com"},
        credentials=[],
    )
    assert node.node_id == "n1"
    assert node.disabled is False
    assert node.credentials == []


def test_workflow_node_with_credentials():
    node = WorkflowNode(
        node_id="n2",
        name="Slack",
        type="action",
        platform_type="n8n-nodes-base.slack",
        parameters={},
        credentials=["slackApi"],
    )
    assert "slackApi" in node.credentials


# ---------------------------------------------------------------------------
# WorkflowEdge
# ---------------------------------------------------------------------------

def test_workflow_edge_defaults():
    edge = WorkflowEdge(edge_id="e1", from_node="n1", to_node="n2")
    assert edge.condition is None


def test_workflow_edge_with_condition():
    edge = WorkflowEdge(edge_id="e2", from_node="n1", to_node="n3", condition="on_error")
    assert edge.condition == "on_error"


# ---------------------------------------------------------------------------
# ExternalConnection
# ---------------------------------------------------------------------------

def test_external_connection_defaults():
    conn = ExternalConnection(connection_id="c1", target="https://api.stripe.com")
    assert conn.auth_type is None
    assert conn.guarded is False


def test_external_connection_guarded():
    conn = ExternalConnection(
        connection_id="c2",
        target="https://internal.corp",
        auth_type="oauth2",
        guarded=True,
    )
    assert conn.guarded is True


# ---------------------------------------------------------------------------
# WorkflowBundle
# ---------------------------------------------------------------------------

def test_workflow_bundle_minimal():
    bundle = WorkflowBundle(
        bundle_id="b1",
        source="n8n",
        workflow_name="My Workflow",
        workflow_id="wf-123",
    )
    assert bundle.source == "n8n"
    assert bundle.nodes == []
    assert bundle.edges == []
    assert bundle.external_connections == []
    assert bundle.metadata == {}
    assert bundle.ir_goal is None


def test_workflow_bundle_with_nodes():
    node = WorkflowNode("n1", "Trigger", "trigger", "n8n-nodes-base.webhook", {}, [])
    bundle = WorkflowBundle(
        bundle_id="b2",
        source="n8n",
        workflow_name="Trigger Flow",
        workflow_id=None,
        nodes=[node],
        metadata={"owner": "team-a", "severity": "medium"},
    )
    assert len(bundle.nodes) == 1
    assert bundle.metadata["owner"] == "team-a"


# ---------------------------------------------------------------------------
# SourceAdapter protocol (structural check — no concrete impl needed)
# ---------------------------------------------------------------------------

def test_source_adapter_is_protocol():
    # SourceAdapter is a runtime_checkable Protocol; a class not implementing it
    # must NOT be an instance of it.
    class NotAnAdapter:
        pass

    assert not isinstance(NotAnAdapter(), SourceAdapter)


def test_source_adapter_structural_match():
    # A class that structurally satisfies the protocol passes isinstance check.
    class FakeAdapter:
        source_id = "fake"
        display_name = "Fake Source"

        def parse(self, raw):
            return raw

        def to_bundle(self, parsed):
            return WorkflowBundle("b", "fake", "test", None)

        def analyze(self, parsed):
            return []

    assert isinstance(FakeAdapter(), SourceAdapter)


# ---------------------------------------------------------------------------
# Evidence + Finding + GovernanceReport
# ---------------------------------------------------------------------------

def test_evidence_defaults():
    ev = Evidence()
    assert ev.source_location is None
    assert ev.raw_excerpt is None


def test_finding_defaults():
    f = Finding(
        finding_id="f1",
        code="TORQA_EXT_001",
        severity="warning",
        title="Unguarded external access",
        explanation="Node calls external API without approval gate.",
        fix_suggestion="Add an approval step before this node.",
    )
    assert f.evidence == []
    assert f.rule_pack is None


def test_governance_report_pass():
    report = GovernanceReport(
        bundle_id="b1",
        source="n8n",
        workflow_name="My Flow",
        decision="pass",
        trust_score=87,
        trust_tier="high",
    )
    assert report.decision == "pass"
    assert report.trust_score == 87
    assert report.deterministic is True
    assert report.ir_version == "1.4"
    assert report.findings == []


def test_governance_report_block_with_finding():
    finding = Finding(
        finding_id="f1",
        code="TORQA_POLICY_001",
        severity="error",
        title="Missing owner",
        explanation="surface_meta.owner is empty.",
        fix_suggestion="Set owner in workflow metadata.",
        evidence=[Evidence(source_location="metadata.owner")],
    )
    report = GovernanceReport(
        bundle_id="b2",
        source="github_actions",
        workflow_name="CI Pipeline",
        decision="block",
        trust_score=40,
        trust_tier="low",
        findings=[finding],
        policy_pack="enterprise",
    )
    assert report.decision == "block"
    assert len(report.findings) == 1
    assert report.findings[0].severity == "error"
    assert report.policy_pack == "enterprise"
