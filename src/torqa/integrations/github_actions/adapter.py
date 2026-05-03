"""GitHub Actions SourceAdapter.

Accepts:
  {"yamlContent": "<raw YAML string>"}   — from REST API or CLI file load
  {<pre-parsed YAML dict>}               — from YAML-aware CLI loader
"""

from __future__ import annotations

from typing import Any, Dict, List

from torqa.bundle.model import WorkflowBundle, WorkflowEdge, WorkflowNode
from torqa.integrations.github_actions.analysis import analyze_github_actions_workflow
from torqa.integrations.github_actions.parser import GitHubWorkflow, parse_github_workflow


class GitHubActionsAdapter:
    source_id: str = "github_actions"
    display_name: str = "GitHub Actions"

    def parse(self, raw: Dict[str, Any]) -> GitHubWorkflow:
        wf, err = parse_github_workflow(raw)
        if err and wf is None:
            raise ValueError(err)
        assert wf is not None
        return wf

    def to_bundle(self, parsed: GitHubWorkflow) -> WorkflowBundle:
        nodes: List[WorkflowNode] = []
        edges: List[WorkflowEdge] = []

        for job in parsed.jobs:
            job_node = WorkflowNode(
                node_id=job.job_id,
                name=job.job_id,
                type="job",
                platform_type="github_actions.job",
                parameters={"runs_on": job.runs_on, "steps": len(job.steps)},
                credentials=[],
                disabled=False,
            )
            nodes.append(job_node)

            for i, step in enumerate(job.steps):
                if not isinstance(step, dict):
                    continue
                step_name = step.get("name") or step.get("uses") or f"step-{i}"
                step_type = "uses" if "uses" in step else "run"
                step_node = WorkflowNode(
                    node_id=f"{job.job_id}-step-{i}",
                    name=str(step_name),
                    type=step_type,
                    platform_type=f"github_actions.{step_type}",
                    parameters=step,
                    credentials=[],
                    disabled=False,
                )
                nodes.append(step_node)
                edges.append(WorkflowEdge(
                    edge_id=f"e_{job.job_id}_{i}",
                    from_node=job.job_id if i == 0 else f"{job.job_id}-step-{i-1}",
                    to_node=f"{job.job_id}-step-{i}",
                ))

        return WorkflowBundle(
            bundle_id=f"gha:{parsed.name}",
            source="github_actions",
            workflow_name=parsed.name,
            workflow_id=None,
            nodes=nodes,
            edges=edges,
            external_connections=[],
            metadata={
                "triggers": parsed.triggers,
                "job_count": len(parsed.jobs),
                "global_permissions": parsed.global_permissions,
            },
            ir_goal=None,
        )

    def analyze(self, parsed: GitHubWorkflow) -> List[Dict[str, Any]]:
        return analyze_github_actions_workflow(parsed)
