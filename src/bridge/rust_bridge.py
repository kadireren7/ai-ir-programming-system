import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional

_DEFAULT_RUST_TIMEOUT = 120.0


def _resolve_rust_core_dir() -> Path:
    """
    Resolve repository rust-core directory from this module location.
    Works for both src-layout and flat-layout repositories.
    """
    here = Path(__file__).resolve()
    for p in [here.parent, *here.parents]:
        cand = p / "rust-core"
        if cand.exists() and cand.is_dir():
            return cand
    # Fallback candidate; caller returns structured error if invalid.
    return here.parent / "rust-core"


def run_rust_core(ir_bundle_json: str) -> Dict[str, Any]:
    """
    CLI JSON bridge to rust-core.
    Expects `rust-core/src/bin/bridge.rs` binary target.
    """
    rust_dir = _resolve_rust_core_dir()
    cmd = ["cargo", "run", "--quiet", "--bin", "bridge"]
    if not rust_dir.exists() or not rust_dir.is_dir():
        return {
            "ok": False,
            "error": "rust_core_directory_not_found",
            "detail": f"Rust core directory not found: {rust_dir}",
            "stderr": "Repository rust-core directory is missing or inaccessible.",
        }
    try:
        timeout = float(os.environ.get("TORQA_RUST_TIMEOUT_SEC", str(_DEFAULT_RUST_TIMEOUT)))
    except ValueError:
        timeout = _DEFAULT_RUST_TIMEOUT
    try:
        proc = subprocess.run(
            cmd,
            input=ir_bundle_json.encode("utf-8"),
            cwd=str(rust_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "error": "rust_core_timeout",
            "detail": f"cargo bridge exceeded {timeout}s (set TORQA_RUST_TIMEOUT_SEC to adjust)",
            "stderr": "Rust bridge subprocess timed out.",
        }
    except FileNotFoundError as ex:
        return {
            "ok": False,
            "error": "rust_toolchain_not_found",
            "detail": str(ex),
            "stderr": "Rust toolchain (cargo) is not installed or not in PATH.",
        }
    except OSError as ex:
        return {
            "ok": False,
            "error": "rust_core_execution_environment_error",
            "detail": str(ex),
            "stderr": "Rust bridge could not start due to invalid working directory or OS error.",
        }
    if proc.returncode != 0:
        return {
            "ok": False,
            "error": "rust_core_execution_failed",
            "stderr": proc.stderr.decode("utf-8", errors="replace"),
        }
    try:
        return {"ok": True, "result": json.loads(proc.stdout.decode("utf-8"))}
    except json.JSONDecodeError as ex:
        return {
            "ok": False,
            "error": "rust_core_invalid_json",
            "detail": str(ex),
            "stdout": proc.stdout.decode("utf-8", errors="replace"),
        }


def run_rust_full_pipeline(ir_envelope: Dict[str, Any]) -> Dict[str, Any]:
    """
    Action-based bridge payload:
    {
      "action": "full_pipeline",
      "ir": { "ir_goal": ... }
    }
    """
    payload = {"action": "full_pipeline", "ir": ir_envelope}
    return run_rust_core(json.dumps(payload, ensure_ascii=False))


def _run_rust_action(
    action: str,
    ir_envelope: Dict[str, Any],
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"action": action, "ir": ir_envelope}
    if context is not None:
        payload["context"] = context
    return run_rust_core(json.dumps(payload, ensure_ascii=False))


def rust_validate_ir(ir_envelope: Dict[str, Any]) -> Dict[str, Any]:
    return _run_rust_action("validate_ir", ir_envelope)


def rust_semantic_report(ir_envelope: Dict[str, Any]) -> Dict[str, Any]:
    return _run_rust_action("semantic_report", ir_envelope)


def rust_execute_ir(ir_envelope: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    return _run_rust_action("execute_ir", ir_envelope, context=context)


def rust_full_pipeline(ir_envelope: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    return _run_rust_action("full_pipeline", ir_envelope, context=context)
