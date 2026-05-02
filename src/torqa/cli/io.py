"""
Shared file loading for Torqa CLI (parse .tq, load bundle JSON).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from torqa.ir.canonical_ir import ir_goal_from_json
from torqa.surface.parse_tq import TQParseError, parse_tq_source
from torqa.cli.bundle_load import load_bundle_from_json_path

LoadErr = Union[str, TQParseError, None]

# One bundle dict, or several from a JSON array file.
BundlePayload = Union[Dict[str, Any], List[Dict[str, Any]]]


def _load_yaml_file(path: Path) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Load a YAML file, requiring PyYAML. Returns (dict, error)."""
    try:
        import yaml  # type: ignore
    except ImportError:
        return None, (
            "PyYAML is required to parse YAML workflow files. "
            "Install it with: pip install pyyaml>=6"
        )
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as ex:
        return None, f"{path}: {ex}"
    try:
        doc = yaml.safe_load(text)
        if not isinstance(doc, dict):
            # Fall back to wrapping raw content for regex-based analysis
            return {"yamlContent": text}, None
        return doc, None
    except Exception as ex:
        return None, f"{path}: YAML parse error: {ex}"


def load_input(
    path: Path, *, integration_source: Optional[str] = None
) -> Tuple[Optional[BundlePayload], LoadErr, str]:
    """
    Returns ``(payload, error, input_type)`` where ``input_type`` is
    ``tq``, ``json``, ``json_batch``, ``n8n``, ``github_actions``, ``agent``, or ``unknown``.

    For ``.json`` files, the root may be a single bundle object or an **array of bundle objects**
    (``json_batch``).
    For ``.yml``/``.yaml`` files, the source must be ``github_actions``.
    """
    suf = path.suffix.lower()

    if suf == ".tq":
        if integration_source == "n8n":
            return None, "n8n: --source n8n applies only to exported .json workflow files", "unknown"
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as ex:
            return None, f"{path}: {ex}", "tq"
        try:
            bundle = parse_tq_source(text, tq_path=path.resolve())
            return bundle, None, "tq"
        except TQParseError as e:
            return None, e, "tq"

    if suf in (".yml", ".yaml"):
        if integration_source not in ("github_actions", "github"):
            return (
                None,
                f"YAML file {path.name!r} requires --source github_actions",
                "unknown",
            )
        raw, err = _load_yaml_file(path)
        if err:
            return None, err, "github_actions"
        assert raw is not None
        from torqa.integrations.registry import get_adapter
        adapter = get_adapter("github_actions")
        try:
            parsed = adapter.parse(raw)
        except ValueError as ex:
            return None, str(ex), "github_actions"
        wb = adapter.to_bundle(parsed)
        findings = adapter.analyze(parsed)
        return {"source": "github_actions", "findings": findings, "metadata": wb.metadata}, None, "github_actions"

    if suf == ".json":
        if integration_source in ("n8n",):
            import json

            from torqa.integrations.registry import get_adapter

            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
            except OSError as ex:
                return None, f"{path}: {ex}", "n8n"
            except json.JSONDecodeError as ex:
                return None, f"{path}: invalid JSON: {ex}", "n8n"
            adapter = get_adapter("n8n")
            try:
                parsed = adapter.parse(raw)
            except ValueError as ex:
                return None, str(ex), "n8n"
            wb = adapter.to_bundle(parsed)
            ir_bundle = wb.metadata["_ir_bundle"]
            return ir_bundle, None, "n8n"

        if integration_source == "agent":
            import json

            from torqa.integrations.registry import get_adapter

            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
            except OSError as ex:
                return None, f"{path}: {ex}", "agent"
            except json.JSONDecodeError as ex:
                return None, f"{path}: invalid JSON: {ex}", "agent"
            adapter = get_adapter("agent")
            try:
                parsed = adapter.parse(raw)
            except ValueError as ex:
                return None, str(ex), "agent"
            wb = adapter.to_bundle(parsed)
            findings = adapter.analyze(parsed)
            return {"source": "agent", "findings": findings, "metadata": wb.metadata}, None, "agent"

        payload, err = load_bundle_from_json_path(path)
        if err is not None:
            return None, err, "json"
        assert payload is not None
        if isinstance(payload, list):
            return payload, None, "json_batch"
        return payload, None, "json"

    return None, f"unsupported file type {path.suffix!r} (use .tq, .json, .yml, or .yaml)", "unknown"


def bundle_jobs(
    file_path: Path,
    payload: Optional[BundlePayload],
    input_type: str,
) -> List[Tuple[str, Dict[str, Any]]]:
    """
    Expand a loaded payload into ``(label_suffix, bundle)`` jobs.

    ``label_suffix`` is ``\"\"`` for a single bundle, or ``\"[i]\"`` for the *i*-th element of a
    JSON array file (display as ``file.json[0]``, etc.).
    """
    if payload is None:
        return []
    if input_type == "json_batch":
        assert isinstance(payload, list)
        return [(f"[{i}]", b) for i, b in enumerate(payload)]
    if input_type == "n8n":
        assert isinstance(payload, dict)
        return [("", payload)]
    assert isinstance(payload, dict)
    return [("", payload)]


def goal_from_bundle(bundle: Dict[str, Any], *, path_hint: str = "") -> Tuple[Any, Optional[str]]:
    try:
        return ir_goal_from_json(bundle), None
    except (TypeError, KeyError, ValueError) as ex:
        prefix = f"{path_hint}: " if path_hint else ""
        return None, f"{prefix}Invalid ir_goal payload: {ex}"
