"""GitHub Actions–specific governance analysis rules.

Each finding has: rule_id, severity (info|review|high|critical),
message, fix_suggestion, target (job_id or "workflow").
"""

from __future__ import annotations

import re
from typing import Any, Dict, List

from torqa.integrations.github_actions.parser import GitHubWorkflow


_SECRET_REF_RE = re.compile(r"\$\{\{\s*secrets\.[A-Za-z0-9_]+\s*\}\}")
_HARDCODED_VALUE_RE = re.compile(r"[A-Za-z0-9+/=_-]{20,}")
_SHA_PIN_RE = re.compile(r"^[0-9a-f]{40}$")
_SEMVER_RE = re.compile(r"^v\d+\.\d+\.\d+")
_MUTABLE_TAG_RE = re.compile(r"^v\d+$")
_USES_RE = re.compile(r"uses\s*:\s*([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)@([A-Za-z0-9._-]+)")


def _f(
    rule_id: str,
    severity: str,
    message: str,
    fix_suggestion: str,
    target: str = "workflow",
) -> Dict[str, Any]:
    return {
        "rule_id": rule_id,
        "severity": severity,
        "message": message,
        "fix_suggestion": fix_suggestion,
        "target": target,
    }


def _yaml_text(wf: GitHubWorkflow) -> str:
    if wf.raw_yaml:
        return wf.raw_yaml
    import json
    return json.dumps(wf.parsed)


def analyze_github_actions_workflow(wf: GitHubWorkflow) -> List[Dict[str, Any]]:
    findings: List[Dict[str, Any]] = []
    text = _yaml_text(wf)

    if not text.strip() and not wf.parsed:
        findings.append(_f(
            "gha.workflow.empty", "critical",
            "GitHub Actions workflow file is empty.",
            "Provide a valid workflow YAML with at least one job and trigger.",
        ))
        return findings

    # --- Global permissions ---
    gp = wf.global_permissions
    if "write-all" in (gp.get("permissions", "") or ""):
        findings.append(_f(
            "gha.permissions.write_all", "critical",
            "Workflow-level permissions set to write-all — every job gets full repo write access.",
            "Replace write-all with scoped per-job permissions using least-privilege.",
        ))
    if re.search(r"permissions\s*:\s*write-all", text, re.IGNORECASE):
        findings.append(_f(
            "gha.permissions.write_all", "critical",
            "Workflow-level permissions set to write-all — every job gets full repo write access.",
            "Replace write-all with scoped per-job permissions using least-privilege.",
        ))

    # --- Trigger: pull_request_target + PR head checkout ---
    has_prt = "pull_request_target" in wf.triggers or re.search(r"pull_request_target", text)
    has_head_checkout = bool(re.search(
        r"ref\s*:\s*\$\{\{\s*github\.event\.pull_request\.head\.", text
    ))
    if has_prt and has_head_checkout:
        findings.append(_f(
            "gha.trigger.pwn_request", "critical",
            "pull_request_target trigger combined with PR head ref checkout — attackers can run "
            "arbitrary code with repository secrets (pwn-request attack).",
            "Never checkout PR head code in pull_request_target unless fully isolated. "
            "Use pull_request trigger instead or remove head ref checkout.",
        ))

    # --- contents:write on PR trigger ---
    pr_triggers = {"pull_request", "pull_request_target"}
    if wf.triggers and pr_triggers.intersection(set(wf.triggers)):
        if re.search(r"contents\s*:\s*write", text, re.IGNORECASE):
            findings.append(_f(
                "gha.permissions.write_on_pr", "high",
                "Workflow grants contents:write on pull_request trigger — risks unauthorized code pushes.",
                "Restrict write permissions for PR-triggered workflows. Use read-only access where possible.",
                "workflow.permissions",
            ))

    # --- Secrets echoed to logs ---
    if re.search(r"echo\s+\$\{\{\s*secrets\.", text, re.IGNORECASE):
        findings.append(_f(
            "gha.secrets.echo_in_run", "critical",
            "A workflow step echoes a secret value — this exposes credentials in CI logs.",
            "Never echo secrets. Pass them as env vars to processes and rely on GitHub's automatic masking.",
            "workflow.steps",
        ))

    # --- Unpinned third-party actions ---
    unpinned: List[str] = []
    for m in _USES_RE.finditer(text):
        action, ref = m.group(1), m.group(2)
        if action.startswith("actions/") or action.startswith("github/"):
            continue  # first-party, less risk
        if _SHA_PIN_RE.match(ref):
            continue  # pinned to SHA ✓
        if _SEMVER_RE.match(ref):
            continue  # full semver acceptable
        if _MUTABLE_TAG_RE.match(ref):
            unpinned.append(f"{action}@{ref}")
    if unpinned:
        findings.append(_f(
            "gha.supply_chain.unpinned_action", "review",
            f"{len(unpinned)} third-party action(s) pinned to mutable tag (supply chain risk): "
            + ", ".join(unpinned[:3]) + ("…" if len(unpinned) > 3 else ""),
            "Pin actions to a full commit SHA (e.g. @abc1234) and use Dependabot to keep them updated.",
            "workflow.steps",
        ))

    # --- Self-hosted runners ---
    if re.search(r"runs-on\s*:\s*self-hosted", text, re.IGNORECASE):
        findings.append(_f(
            "gha.runner.self_hosted", "review",
            "Workflow uses self-hosted runners which may have elevated host and network access.",
            "Harden self-hosted runner environments, apply network isolation, and avoid on public repos.",
            "workflow.jobs",
        ))

    # --- Per-job analysis ---
    for job in wf.jobs:
        job_perms = job.permissions

        # contents:write per job on PR trigger
        if job_perms.get("contents") == "write" and wf.triggers and pr_triggers.intersection(set(wf.triggers)):
            findings.append(_f(
                "gha.permissions.job_write_on_pr", "high",
                f"Job '{job.job_id}' grants contents:write on pull_request trigger.",
                "Scope job-level permissions to read-only for PR-triggered jobs.",
                f"jobs.{job.job_id}",
            ))

        # id-token:write without explicit need
        if job_perms.get("id-token") == "write":
            findings.append(_f(
                "gha.permissions.id_token_write", "review",
                f"Job '{job.job_id}' requests id-token:write — used for OIDC cloud auth. "
                "Ensure this is intentional and scoped to the correct provider.",
                "Restrict id-token:write to jobs that explicitly require OIDC authentication.",
                f"jobs.{job.job_id}",
            ))

        # Scan steps for secrets echoed and hardcoded credentials
        for step in job.steps:
            if not isinstance(step, dict):
                continue
            run_cmd = step.get("run", "")
            if isinstance(run_cmd, str):
                if re.search(r"echo\s+\$\{\{\s*secrets\.", run_cmd, re.IGNORECASE):
                    findings.append(_f(
                        "gha.secrets.echo_in_run", "critical",
                        f"Step '{step.get('name', 'unnamed')}' in job '{job.job_id}' echoes a secret.",
                        "Remove echo of secrets. Let GitHub's log masking handle redaction.",
                        f"jobs.{job.job_id}.steps",
                    ))
            # Env vars with possible hardcoded credentials
            step_env = step.get("env") or {}
            if isinstance(step_env, dict):
                for env_key, env_val in step_env.items():
                    val_str = str(env_val)
                    if not _SECRET_REF_RE.search(val_str) and _HARDCODED_VALUE_RE.search(val_str):
                        findings.append(_f(
                            "gha.secrets.hardcoded_in_step_env", "high",
                            f"Step env var '{env_key}' in job '{job.job_id}' may contain a hardcoded credential.",
                            "Replace hardcoded values with ${{ secrets.KEY }} references.",
                            f"jobs.{job.job_id}.steps.env",
                        ))

    # --- Secrets passed as env without masking ---
    if re.search(r"env\s*:\s*\n[\s\S]*?\$\{\{\s*secrets\.", text, re.MULTILINE) and "add-mask" not in text:
        findings.append(_f(
            "gha.secrets.env_without_mask", "info",
            "Secrets passed as environment variables without explicit masking step.",
            "Add '::add-mask::${{ secrets.KEY }}' steps or rely on GitHub's automatic secret masking.",
            "workflow.env",
        ))

    # --- Missing top-level permissions block ---
    if not wf.global_permissions and not re.search(r"^\s*permissions\s*:", text, re.MULTILINE):
        findings.append(_f(
            "gha.permissions.missing", "review",
            "No top-level permissions block — jobs inherit default GITHUB_TOKEN permissions (often too broad).",
            "Add a top-level permissions block with minimum required scopes, defaulting to read-only.",
        ))

    # --- No findings = clean ---
    if not findings:
        findings.append(_f(
            "gha.workflow.no_critical_risk", "info",
            "No high-signal governance risks detected in this GitHub Actions workflow.",
            "Continue with branch protection, required reviews, and CODEOWNERS enforcement.",
        ))

    return findings
