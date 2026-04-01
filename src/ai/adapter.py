"""
Optional LLM → IR pipeline with schema validation and verifier feedback (repair loop).

Requires OPENAI_API_KEY in the environment. Without it, returns a structured skip response.
Uses the OpenAI Chat Completions HTTP API (no extra Python package required).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.diagnostics.codes import PX_AI_HTTP, PX_AI_MAX_RETRIES, PX_AI_NO_KEY
from src.diagnostics.formal_phases import annotate_with_formal
from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json
from src.language.authoring_prompt import build_ai_authoring_system_prompt

REPO = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO / "spec" / "IR_BUNDLE.schema.json"

try:
    from dotenv import load_dotenv

    load_dotenv(REPO / ".env")
    load_dotenv(REPO / ".env.local")
except ImportError:
    pass


def _load_schema() -> Optional[dict]:
    if not SCHEMA_PATH.is_file():
        return None
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    if not text:
        raise ValueError("empty model output")
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in model output")
    return json.loads(text[start : end + 1])


def _validate_schema(instance: dict) -> List[str]:
    try:
        import jsonschema
    except ImportError:
        return []
    schema = _load_schema()
    if not schema:
        return []
    try:
        jsonschema.validate(instance=instance, schema=schema)
    except jsonschema.ValidationError as ex:
        return [str(ex.message)]
    return []


def suggest_ir_bundle_from_prompt(
    user_prompt: str,
    *,
    max_retries: int = 3,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call OpenAI (if configured) to emit an IR bundle; validate schema + IR + diagnostics.
    On failure, sends verifier errors back for up to max_retries repair attempts.
    """
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return {
            "ok": False,
            "ir_bundle": None,
            "attempts": [],
            "issues": annotate_with_formal(
                ["OPENAI_API_KEY is not set; configure the key to enable AI suggestions."],
                legacy_phase="ai",
            ),
            "code": PX_AI_NO_KEY,
        }

    model_name = model or os.environ.get("OPENAI_IR_MODEL", "gpt-4o-mini")
    system = build_ai_authoring_system_prompt()

    attempts: List[Dict[str, Any]] = []
    feedback = ""

    for attempt in range(max_retries + 1):
        user_content = user_prompt.strip()
        if feedback:
            user_content = (
                f"{user_prompt.strip()}\n\nFix the previous JSON. Verifier feedback:\n{feedback}"
            )
        body = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.15,
            "response_format": {"type": "json_object"},
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as ex:
            err_body = ex.read().decode("utf-8", errors="replace") if ex.fp else ""
            attempts.append({"attempt": attempt, "error": "http_error", "detail": err_body[:2000]})
            return {
                "ok": False,
                "ir_bundle": None,
                "attempts": attempts,
                "issues": annotate_with_formal(
                    [f"{PX_AI_HTTP}: {ex.code} {err_body[:500]}"], legacy_phase="ai"
                ),
                "code": PX_AI_HTTP,
            }
        except Exception as ex:
            attempts.append({"attempt": attempt, "error": str(ex)})
            return {
                "ok": False,
                "ir_bundle": None,
                "attempts": attempts,
                "issues": annotate_with_formal([str(ex)], legacy_phase="ai"),
                "code": PX_AI_HTTP,
            }

        try:
            msg = raw["choices"][0]["message"]["content"]
            bundle = _extract_json_object(msg)
        except (KeyError, IndexError, ValueError, json.JSONDecodeError) as ex:
            attempts.append({"attempt": attempt, "parse_error": str(ex), "snippet": str(raw)[:500]})
            feedback = f"Parse error: {ex}. Return only valid JSON with ir_goal."
            continue

        schema_err = _validate_schema(bundle)
        if schema_err:
            attempts.append({"attempt": attempt, "schema_errors": schema_err})
            feedback = "JSON Schema: " + "; ".join(schema_err)
            continue

        try:
            goal = ir_goal_from_json(bundle)
        except Exception as ex:
            attempts.append({"attempt": attempt, "ir_parse": str(ex)})
            feedback = f"IR parse error: {ex}"
            continue

        report = build_full_diagnostic_report(goal)
        if report["ok"]:
            attempts.append({"attempt": attempt, "status": "ok"})
            return {
                "ok": True,
                "ir_bundle": bundle,
                "attempts": attempts,
                "issues": [],
                "diagnostics": report,
            }

        parts = [f"{i['code']}: {i['message']}" for i in report["issues"][:12]]
        feedback = "\n".join(parts)
        attempts.append({"attempt": attempt, "diagnostics": report["issues"][:20]})

    return {
        "ok": False,
        "ir_bundle": None,
        "attempts": attempts,
        "issues": annotate_with_formal(
            ["Max retries exceeded; IR still invalid."], legacy_phase="ai"
        ),
        "code": PX_AI_MAX_RETRIES,
    }
