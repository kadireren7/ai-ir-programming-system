"""AI Agent SourceAdapter."""

from __future__ import annotations

from typing import Any, Dict, List

from torqa.bundle.model import WorkflowBundle, WorkflowNode
from torqa.integrations.agent.analysis import analyze_agent_definition
from torqa.integrations.agent.parser import AgentDefinition, parse_agent_definition


class AgentAdapter:
    source_id: str = "agent"
    display_name: str = "AI Agent"

    def parse(self, raw: Dict[str, Any]) -> AgentDefinition:
        agent, err = parse_agent_definition(raw)
        if err and agent is None:
            raise ValueError(err)
        assert agent is not None
        return agent

    def to_bundle(self, parsed: AgentDefinition) -> WorkflowBundle:
        nodes: List[WorkflowNode] = [
            WorkflowNode(
                node_id="agent-root",
                name=parsed.name,
                type="agent",
                platform_type="ai_agent.root",
                parameters={
                    "model": parsed.model,
                    "tool_count": len(parsed.tools),
                    "has_system_prompt": bool(parsed.system_prompt),
                    "human_in_loop": parsed.human_in_loop,
                },
                credentials=[],
                disabled=False,
            )
        ]
        for i, tool in enumerate(parsed.tools):
            nodes.append(WorkflowNode(
                node_id=f"tool-{i}",
                name=tool.name,
                type="tool",
                platform_type="ai_agent.tool",
                parameters=tool.raw,
                credentials=[],
                disabled=False,
            ))

        return WorkflowBundle(
            bundle_id=f"agent:{parsed.name}",
            source="agent",
            workflow_name=parsed.name,
            workflow_id=None,
            nodes=nodes,
            edges=[],
            external_connections=[],
            metadata={
                "model": parsed.model,
                "tool_count": len(parsed.tools),
                "permissions": parsed.permissions,
                "human_in_loop": parsed.human_in_loop,
            },
            ir_goal=None,
        )

    def analyze(self, parsed: AgentDefinition) -> List[Dict[str, Any]]:
        return analyze_agent_definition(parsed)
