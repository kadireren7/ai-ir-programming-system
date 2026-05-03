"""AI Agent definition parser.

Expected schema (all fields optional except ``name``):
{
  "name": "customer-support-agent",
  "version": "1.0",
  "model": "gpt-4o",
  "system_prompt": "You are...",
  "tools": [
    {"name": "web_search", "description": "...", "permissions": ["network"]},
    ...
  ],
  "permissions": ["file_read", "network"],
  "memory": {"type": "in-context", "max_tokens": 4096},
  "max_iterations": 10,
  "human_in_loop": false
}
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class AgentTool:
    name: str
    description: str = ""
    permissions: List[str] = field(default_factory=list)
    raw: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentDefinition:
    name: str
    model: str
    system_prompt: str
    tools: List[AgentTool]
    permissions: List[str]
    memory: Dict[str, Any]
    max_iterations: Optional[int]
    human_in_loop: bool
    raw: Dict[str, Any]


def parse_agent_definition(raw: Dict[str, Any]) -> Tuple[Optional[AgentDefinition], Optional[str]]:
    if not isinstance(raw, dict):
        return None, "Agent definition must be a JSON object"

    name = raw.get("name")
    if not name:
        return None, "Agent definition must include a 'name' field"

    tools_raw = raw.get("tools") or []
    tools: List[AgentTool] = []
    if isinstance(tools_raw, list):
        for t in tools_raw:
            if isinstance(t, str):
                tools.append(AgentTool(name=t))
            elif isinstance(t, dict):
                tools.append(AgentTool(
                    name=str(t.get("name") or t.get("type") or "unknown"),
                    description=str(t.get("description") or ""),
                    permissions=[str(p) for p in (t.get("permissions") or [])],
                    raw=t,
                ))

    permissions = [str(p) for p in (raw.get("permissions") or [])]
    memory = raw.get("memory") or {}
    max_iter_raw = raw.get("max_iterations") or raw.get("maxIterations")
    max_iter = int(max_iter_raw) if isinstance(max_iter_raw, (int, float)) else None
    human_in_loop = bool(raw.get("human_in_loop") or raw.get("humanInLoop") or raw.get("require_approval"))

    return AgentDefinition(
        name=str(name),
        model=str(raw.get("model") or ""),
        system_prompt=str(raw.get("system_prompt") or raw.get("systemPrompt") or ""),
        tools=tools,
        permissions=permissions,
        memory=memory if isinstance(memory, dict) else {},
        max_iterations=max_iter,
        human_in_loop=human_in_loop,
        raw=raw,
    ), None
