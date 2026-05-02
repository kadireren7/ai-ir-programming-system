"""GitHub Actions workflow parser.

Accepts either:
- A dict with ``yamlContent`` key (raw YAML string) → parses with PyYAML if available
- A pre-parsed dict (YAML already loaded) → used directly

Both paths produce a ``GitHubWorkflow`` dataclass.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class GitHubJob:
    job_id: str
    runs_on: str
    steps: List[Dict[str, Any]] = field(default_factory=list)
    permissions: Dict[str, str] = field(default_factory=dict)
    environment: Optional[str] = None


@dataclass
class GitHubWorkflow:
    name: str
    raw_yaml: str                        # original YAML string (may be empty)
    parsed: Dict[str, Any]              # parsed YAML dict
    triggers: List[str] = field(default_factory=list)
    jobs: List[GitHubJob] = field(default_factory=list)
    global_permissions: Dict[str, str] = field(default_factory=dict)
    global_env: Dict[str, str] = field(default_factory=dict)


def _try_import_yaml() -> Any:
    try:
        import yaml  # type: ignore
        return yaml
    except ImportError:
        return None


def _parse_yaml_string(text: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    yaml = _try_import_yaml()
    if yaml is None:
        return None, "PyYAML not installed — install pyyaml>=6 for full YAML parsing"
    try:
        doc = yaml.safe_load(text)
        if not isinstance(doc, dict):
            return None, "Workflow YAML did not parse to a mapping"
        return doc, None
    except Exception as exc:
        return None, f"YAML parse error: {exc}"


def _extract_triggers(parsed: Dict[str, Any]) -> List[str]:
    on = parsed.get("on") or parsed.get(True)  # yaml parses 'on' as True in some versions
    if on is None:
        return []
    if isinstance(on, str):
        return [on]
    if isinstance(on, list):
        return [str(t) for t in on]
    if isinstance(on, dict):
        return list(on.keys())
    return []


def _extract_permissions(perm_block: Any) -> Dict[str, str]:
    if not isinstance(perm_block, dict):
        return {}
    return {str(k): str(v) for k, v in perm_block.items()}


def _extract_jobs(parsed: Dict[str, Any]) -> List[GitHubJob]:
    jobs_block = parsed.get("jobs")
    if not isinstance(jobs_block, dict):
        return []
    result: List[GitHubJob] = []
    for job_id, job_def in jobs_block.items():
        if not isinstance(job_def, dict):
            continue
        runs_on = job_def.get("runs-on", "")
        if isinstance(runs_on, list):
            runs_on = " ".join(str(r) for r in runs_on)
        steps = job_def.get("steps") or []
        perms = _extract_permissions(job_def.get("permissions"))
        env = job_def.get("environment")
        env_str = env if isinstance(env, str) else (env.get("name") if isinstance(env, dict) else None)
        result.append(
            GitHubJob(
                job_id=str(job_id),
                runs_on=str(runs_on),
                steps=steps if isinstance(steps, list) else [],
                permissions=perms,
                environment=env_str,
            )
        )
    return result


def parse_github_workflow(raw: Dict[str, Any]) -> Tuple[Optional[GitHubWorkflow], Optional[str]]:
    """Parse a raw input dict into a GitHubWorkflow.

    raw may be:
      {"yamlContent": "<yaml string>"}   → YAML parsed internally
      {<pre-parsed YAML dict>}            → used directly
    """
    yaml_content = raw.get("yamlContent")

    if isinstance(yaml_content, str):
        parsed, err = _parse_yaml_string(yaml_content)
        if err and parsed is None:
            parsed = {}
        raw_yaml = yaml_content
    else:
        parsed = raw
        raw_yaml = ""

    if parsed is None:
        parsed = {}

    name = parsed.get("name") or "unnamed-workflow"
    triggers = _extract_triggers(parsed)
    global_perms = _extract_permissions(parsed.get("permissions"))
    global_env = {k: str(v) for k, v in (parsed.get("env") or {}).items()} if isinstance(parsed.get("env"), dict) else {}
    jobs = _extract_jobs(parsed)

    return GitHubWorkflow(
        name=str(name),
        raw_yaml=raw_yaml,
        parsed=parsed,
        triggers=triggers,
        jobs=jobs,
        global_permissions=global_perms,
        global_env=global_env,
    ), None
