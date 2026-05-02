"""AI Agent governance analysis rules.

Checks agent definitions for security, scope, and policy violations.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List

from torqa.integrations.agent.parser import AgentDefinition


_SECRET_KEY_RE = re.compile(r"(api[-_]?key|token|secret|password|authorization|bearer)", re.IGNORECASE)
_MASK_RE = re.compile(r"(\*{3,}|<redacted>|<hidden>|xxxxx)", re.IGNORECASE)
_HARDCODED_RE = re.compile(r"[A-Za-z0-9+/=_-]{20,}")
_INJECTION_PHRASES_RE = re.compile(
    r"ignore\s+(previous|above|all|prior)\s+(instructions?|context|prompt|constraints?)",
    re.IGNORECASE,
)

_DANGEROUS_TOOL_PATTERNS = [
    ("exec|execute|run_code|shell|bash|cmd|subprocess|eval", "agent.tool.code_execution",
     "critical", "Agent has code/shell execution capability — enables arbitrary system command runs."),
    ("file_write|write_file|save_file|delete_file|rm_file|unlink", "agent.tool.file_write",
     "high", "Agent can write or delete files — risks data destruction and exfiltration."),
    ("db_write|sql_execute|database_write|mongo_write|redis_set", "agent.tool.db_write",
     "high", "Agent has database write access — ensure queries are scoped and parameterized."),
    ("send_email|send_message|post_webhook|slack_post|discord_send|telegram_send", "agent.tool.side_effect",
     "review", "Agent can send messages or emails — verify rate limits and content filters exist."),
    ("browse|fetch_url|http_request|curl|wget|requests\\.get", "agent.tool.network",
     "review", "Agent has unrestricted network access — potential data exfiltration surface."),
    ("deploy|kubectl|docker_run|terraform|helm_install", "agent.tool.infra_mutation",
     "critical", "Agent can mutate infrastructure — catastrophic blast radius if compromised."),
]

_PRIVILEGED_PERMS = {"admin", "write", "delete", "sudo", "root", "superuser", "full_access"}


def _f(rule_id: str, severity: str, message: str, fix_suggestion: str, target: str = "agent") -> Dict[str, Any]:
    return {
        "rule_id": rule_id,
        "severity": severity,
        "message": message,
        "fix_suggestion": fix_suggestion,
        "target": target,
    }


def analyze_agent_definition(agent: AgentDefinition) -> List[Dict[str, Any]]:
    findings: List[Dict[str, Any]] = []

    # --- System prompt checks ---
    if not agent.system_prompt:
        findings.append(_f(
            "agent.prompt.missing", "high",
            "Agent has no system prompt — behavior is undefined and exploitable.",
            "Define a system prompt that constrains the agent's role, scope, and refusal policies.",
            "agent.systemPrompt",
        ))
    else:
        if len(agent.system_prompt) > 8000:
            findings.append(_f(
                "agent.prompt.oversized", "review",
                f"System prompt is very large ({len(agent.system_prompt):,} chars) — "
                "increases token cost and reduces governance clarity.",
                "Simplify the system prompt. Move static reference data to RAG retrieval instead.",
                "agent.systemPrompt",
            ))

        if _INJECTION_PHRASES_RE.search(agent.system_prompt):
            findings.append(_f(
                "agent.prompt.injection_pattern", "critical",
                "System prompt contains phrases that attackers exploit for prompt injection "
                "(e.g. 'ignore previous instructions').",
                "Remove injection-prone phrases and add explicit anti-jailbreak constraints.",
                "agent.systemPrompt",
            ))

        # Hardcoded secrets in system prompt
        for line in agent.system_prompt.splitlines():
            for part in line.split():
                if _SECRET_KEY_RE.search(part) and not _MASK_RE.search(line):
                    if _HARDCODED_RE.search(line):
                        findings.append(_f(
                            "agent.prompt.hardcoded_secret", "critical",
                            "System prompt may contain a hardcoded credential or secret value.",
                            "Remove credentials from prompts. Inject secrets via environment variables at runtime.",
                            "agent.systemPrompt",
                        ))
                        break

    # --- Model checks ---
    if not agent.model:
        findings.append(_f(
            "agent.model.unspecified", "review",
            "Agent definition does not specify a model — inconsistent governance posture.",
            "Specify the model explicitly and pin to a tested version (e.g. 'gpt-4o-2024-08-06').",
            "agent.model",
        ))

    # --- Tool checks ---
    seen_rules: set = set()
    for tool in agent.tools:
        tool_name_lower = tool.name.lower()
        for pattern, rule_id, severity, message in _DANGEROUS_TOOL_PATTERNS:
            if rule_id in seen_rules:
                continue
            if re.search(pattern, tool_name_lower, re.IGNORECASE):
                findings.append(_f(
                    rule_id, severity, message,
                    "Restrict tool access to minimum required scope. Add human-in-the-loop approval "
                    "for irreversible or high-impact actions.",
                    f"agent.tools.{tool.name}",
                ))
                seen_rules.add(rule_id)

        # Tool-level permissions
        for perm in tool.permissions:
            if any(p in perm.lower() for p in _PRIVILEGED_PERMS):
                findings.append(_f(
                    "agent.tool.privileged_permission", "high",
                    f"Tool '{tool.name}' requests privileged permission '{perm}'.",
                    "Apply least-privilege: grant only minimum permissions per tool.",
                    f"agent.tools.{tool.name}.permissions",
                ))

    # --- Scope creep: too many tools ---
    if len(agent.tools) > 15:
        findings.append(_f(
            "agent.scope.too_many_tools", "review",
            f"Agent has {len(agent.tools)} tools — high tool count increases attack surface and scope creep.",
            "Audit and remove unused tools. Split broad agents into focused single-purpose sub-agents.",
            "agent.tools",
        ))

    # --- Top-level permissions ---
    for perm in agent.permissions:
        if any(p in perm.lower() for p in _PRIVILEGED_PERMS):
            findings.append(_f(
                "agent.permissions.privileged", "high",
                f"Agent has top-level privileged permission '{perm}'.",
                "Apply least-privilege principle. Grant only minimum permissions for stated task.",
                "agent.permissions",
            ))

    # --- Memory / context bounds ---
    if not agent.memory:
        findings.append(_f(
            "agent.memory.unbounded", "review",
            "Agent has no memory/context bounds defined — risk of context overflow and data leakage across sessions.",
            "Define explicit memory bounds (max_tokens, session isolation) to prevent cross-session data bleed.",
            "agent.memory",
        ))

    # --- Human-in-the-loop ---
    has_dangerous = any(
        r in seen_rules
        for r in ("agent.tool.code_execution", "agent.tool.file_write", "agent.tool.db_write", "agent.tool.infra_mutation")
    )
    if has_dangerous and not agent.human_in_loop:
        findings.append(_f(
            "agent.governance.no_human_approval", "high",
            "Agent has destructive/irreversible capabilities but no human-in-the-loop approval gate.",
            "Add human approval checkpoints before irreversible actions (file writes, deploys, DB mutations).",
            "agent.human_in_loop",
        ))

    # --- Iteration limit ---
    if agent.max_iterations is None:
        findings.append(_f(
            "agent.safety.no_iteration_limit", "review",
            "Agent has no max_iterations limit — risk of infinite loops consuming resources.",
            "Set a reasonable max_iterations limit to prevent runaway agent execution.",
            "agent.max_iterations",
        ))
    elif agent.max_iterations > 100:
        findings.append(_f(
            "agent.safety.high_iteration_limit", "info",
            f"Agent iteration limit is high ({agent.max_iterations}) — verify this is intentional.",
            "Consider a lower limit and implement checkpointing for long-running agents.",
            "agent.max_iterations",
        ))

    if not findings:
        findings.append(_f(
            "agent.no_critical_risk", "info",
            "No high-signal governance risks detected in this AI agent definition.",
            "Continuously review tool scope as agent capabilities expand.",
        ))

    return findings
