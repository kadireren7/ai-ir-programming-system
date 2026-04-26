"""
Optional project-level defaults from ``torqa.toml`` (walk upward from the CLI anchor path).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Mapping, Optional

from torqa.policy.profiles import normalize_trust_profile


class TorqaConfigError(ValueError):
    """Invalid ``torqa.toml`` contents."""


@dataclass(frozen=True)
class TorqaProjectConfig:
    """Defaults when ``torqa.toml`` is absent or keys are omitted."""

    profile: str = "default"
    fail_on_warning: bool = False
    report_format: str = "html"


def _toml_loads(text: str) -> Dict[str, Any]:
    try:
        import tomllib  # Python 3.11+
    except ImportError:  # pragma: no cover
        import tomli as tomllib  # type: ignore[no-redef]
    return tomllib.loads(text)


def _merge_toml_dict(data: Mapping[str, Any]) -> Dict[str, Any]:
    """Prefer ``[torqa]`` table; otherwise read supported keys from the document root."""
    sect = data.get("torqa")
    if isinstance(sect, dict):
        return dict(sect)
    out: Dict[str, Any] = {}
    for k in ("profile", "fail_on_warning", "report_format"):
        if k in data:
            out[k] = data[k]
    return out


def _parse_bool(val: Any, key: str) -> bool:
    if isinstance(val, bool):
        return val
    raise TorqaConfigError(f"torqa.toml: {key} must be a boolean, got {type(val).__name__}")


def _parse_profile(val: Any) -> str:
    if val is None:
        return "default"
    if not isinstance(val, str):
        raise TorqaConfigError(f"torqa.toml: profile must be a string, got {type(val).__name__}")
    s = val.strip()
    if not s:
        raise TorqaConfigError("torqa.toml: profile must not be empty")
    return normalize_trust_profile(s)


def _parse_report_format(val: Any) -> str:
    if val is None:
        return "html"
    if not isinstance(val, str):
        raise TorqaConfigError(f"torqa.toml: report_format must be a string, got {type(val).__name__}")
    s = val.strip().lower()
    if s not in ("html", "md"):
        raise TorqaConfigError("torqa.toml: report_format must be 'html' or 'md'")
    return s


def parse_torqa_toml_file(path: Path) -> TorqaProjectConfig:
    """Parse ``path`` and return merged config (raises TorqaConfigError on bad values)."""
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as ex:
        raise TorqaConfigError(f"torqa.toml: could not read {path}: {ex}") from ex
    try:
        data = _toml_loads(raw)
    except Exception as ex:
        raise TorqaConfigError(f"torqa.toml: invalid TOML ({path}): {ex}") from ex
    if not isinstance(data, dict):
        raise TorqaConfigError("torqa.toml: expected a TOML table at the root")
    merged = _merge_toml_dict(data)

    try:
        profile = _parse_profile(merged.get("profile"))
    except ValueError as ex:
        raise TorqaConfigError(str(ex)) from ex
    fail_on_warning = _parse_bool(merged.get("fail_on_warning", False), "fail_on_warning")
    report_format = _parse_report_format(merged.get("report_format"))

    return TorqaProjectConfig(
        profile=profile,
        fail_on_warning=fail_on_warning,
        report_format=report_format,
    )


def find_torqa_toml(start_dir: Path) -> Optional[Path]:
    """Walk upward from ``start_dir`` and return the first ``torqa.toml`` path, if any."""
    cur = start_dir.resolve()
    for base in [cur, *cur.parents]:
        candidate = base / "torqa.toml"
        if candidate.is_file():
            return candidate
    return None


def load_torqa_project_config(start_dir: Path) -> TorqaProjectConfig:
    """
    Load project defaults from the nearest ``torqa.toml`` (walking parents from ``start_dir``),
    or built-in defaults when no file exists.
    """
    found = find_torqa_toml(start_dir)
    if found is None:
        return TorqaProjectConfig()
    return parse_torqa_toml_file(found)
