"""
TORQA site host: marketing bundle (``/``), JSON APIs, desktop pointer, ``/console`` → ``/``.

Static build output: ``website/dist/site/`` (``npm run build`` in ``website/``).
"""

from __future__ import annotations

import base64
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.ai.adapter import suggest_ir_bundle_from_prompt
from src.control.ir_mutation_json import try_apply_ir_mutations_from_json
from src.control.patch_preview import build_patch_preview_report
from src.diagnostics.report import build_full_diagnostic_report, build_ir_shape_error_report
from src.diagnostics.user_hints import suggested_next_from_report, tq_parse_extras
from src.diagnostics.system_health import build_system_health_report
from src.ir.canonical_ir import (
    CANONICAL_IR_VERSION,
    ir_goal_from_json,
    ir_goal_to_json,
    validate_bundle_envelope,
)
from src.ir.explain import explain_ir_goal
from src.ir.quality import build_ir_quality_report
from src.orchestrator.pipeline_run import build_console_run_payload
from src.projection.projection_strategy import ProjectionContext, explain_projection_strategy
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from src.project_materialize import build_zip_bytes, validate_bundle_dict
from .middleware_rate_limit import RateLimitMiddleware

WEBSITE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = WEBSITE_ROOT.parent

try:
    from dotenv import load_dotenv

    load_dotenv(REPO_ROOT / ".env")
    load_dotenv(REPO_ROOT / ".env.local")
except ImportError:
    pass

EXAMPLES_DIR = REPO_ROOT / "examples" / "core"
TQ_EXAMPLES_DIR = REPO_ROOT / "examples" / "torqa"
BENCHMARK_FLAGSHIP_DIR = REPO_ROOT / "examples" / "benchmark_flagship"
GATE_PROOF_MANIFEST = BENCHMARK_FLAGSHIP_DIR / "gate_invalid" / "manifest.json"
SITE_DIR = WEBSITE_ROOT / "dist" / "site"
SHARED_STATIC_DIR = WEBSITE_ROOT / "static" / "shared"
DESKTOP_STATIC = WEBSITE_ROOT / "static" / "desktop"

_LOG = logging.getLogger("torqa.website")


def _bundle_envelope_errors(bundle: Dict[str, Any]) -> List[str]:
    if not isinstance(bundle, dict):
        return ["Request body ir_bundle must be a JSON object."]
    return validate_bundle_envelope(bundle)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s [%(name)s] %(message)s",
    )
    _LOG.info("TORQA website host ready")
    yield


class RunRequest(BaseModel):
    ir_bundle: Dict[str, Any] = Field(..., description='Envelope {"ir_goal": {...}}')
    demo_inputs: Optional[Dict[str, Any]] = None
    engine_mode: Literal["rust_preferred", "python_only", "rust_only"] = "rust_preferred"


class PatchRequest(BaseModel):
    ir_bundle: Dict[str, Any]
    mutations: List[Dict[str, Any]] = Field(default_factory=list)


class TqCompileRequest(BaseModel):
    source: str = Field(..., min_length=1, description="Raw .tq surface text")


class AISuggestRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    max_retries: int = Field(default=3, ge=0, le=8)
    model: Optional[str] = None


class SystemHealthRequest(RunRequest):
    skip_parity: bool = False


app = FastAPI(
    title="TORQA Web",
    description="TORQA: marketing site (/), /desktop pointer, JSON APIs; /console redirects to /.",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(RateLimitMiddleware, max_calls=120, window_sec=60.0)

if SITE_DIR.is_dir():
    app.mount("/static/site", StaticFiles(directory=str(SITE_DIR)), name="site")
if SHARED_STATIC_DIR.is_dir():
    app.mount("/static/shared", StaticFiles(directory=str(SHARED_STATIC_DIR)), name="shared")


@app.get("/")
def site_home():
    """Marketing site bundle from ``website/dist/site`` (Vite production build)."""
    page = SITE_DIR / "index.html"
    if not page.is_file():
        raise HTTPException(
            500,
            "Site bundle missing: run `npm run build` in website/ (expect website/dist/site/index.html).",
        )
    return FileResponse(page)


@app.get("/console")
def console_legacy_redirect():
    """Legacy path; marketing-only web surface."""
    return RedirectResponse(url="/", status_code=301)


@app.get("/desktop")
def desktop_page():
    """Native-desktop pointer page."""
    page = DESKTOP_STATIC / "index.html"
    if not page.is_file():
        raise HTTPException(500, "desktop pointer missing: website/static/desktop/index.html")
    return FileResponse(page)


def _package_version() -> str:
    try:
        from importlib.metadata import version

        return version("torqa")
    except Exception:
        return "0.0.0"


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "torqa-website",
        "canonical_ir_version": CANONICAL_IR_VERSION,
        "package_version": _package_version(),
    }


@app.get("/api/demo/flagship-tq")
def api_demo_flagship_tq():
    """P34: canonical benchmark surface for demo UIs."""
    path = BENCHMARK_FLAGSHIP_DIR / "app.tq"
    if not path.is_file():
        raise HTTPException(404, "flagship app.tq not found")
    return {
        "name": "app.tq",
        "path": str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
        "source": path.read_text(encoding="utf-8"),
    }


@app.get("/api/demo/benchmark-report")
def api_demo_benchmark_report():
    """P32 baseline metrics JSON (repo fixture)."""
    path = BENCHMARK_FLAGSHIP_DIR / "compression_baseline_report.json"
    if not path.is_file():
        return {"ok": False, "message": "compression_baseline_report.json not found"}
    return {"ok": True, "report": json.loads(path.read_text(encoding="utf-8"))}


@app.get("/api/demo/gate-proof-report")
def api_demo_gate_proof_report():
    """P33 gate proof summary (manifest-driven; safe repo paths only)."""
    if not GATE_PROOF_MANIFEST.is_file():
        return {"ok": False, "message": "gate proof manifest not found"}
    from src.benchmarks.gate_proof import run_gate_proof_manifest

    report = run_gate_proof_manifest(GATE_PROOF_MANIFEST)
    return {"ok": True, "report": report}


@app.get("/api/examples")
def list_examples():
    if not EXAMPLES_DIR.is_dir():
        return {"examples": []}
    out: List[Dict[str, str]] = []
    paths = sorted(
        EXAMPLES_DIR.glob("*.json"),
        key=lambda x: (not x.name.startswith("demo_"), x.name),
    )
    for p in paths:
        out.append({"name": p.name, "path": str(p.relative_to(REPO_ROOT)).replace("\\", "/")})
    tq_out: List[Dict[str, str]] = []
    if TQ_EXAMPLES_DIR.is_dir():
        for p in sorted(TQ_EXAMPLES_DIR.glob("*.tq")):
            tq_out.append({"name": p.name, "path": str(p.relative_to(REPO_ROOT)).replace("\\", "/")})
    return {"examples": out, "tq_examples": tq_out}


@app.get("/api/examples/tq/{name}")
def get_tq_example(name: str):
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(400, "invalid name")
    path = TQ_EXAMPLES_DIR / name
    if not path.is_file() or path.suffix.lower() != ".tq":
        raise HTTPException(404, "example not found")
    return {"name": name, "source": path.read_text(encoding="utf-8")}


@app.get("/api/examples/{name}")
def get_example(name: str):
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(400, "invalid name")
    path = EXAMPLES_DIR / name
    if not path.is_file():
        raise HTTPException(404, "example not found")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@app.post("/api/materialize-project-zip")
def api_materialize_project_zip(body: RunRequest):
    """
    Zip of the generated artifact tree (no server-side path write).

    See ``docs/WEBUI_SECURITY.md``.
    """
    rep = validate_bundle_dict(body.ir_bundle)
    if not rep.get("ok"):
        return JSONResponse(
            status_code=400,
            content={"ok": False, "issues": rep.get("issues", []), "message": "Bundle failed validation"},
        )
    zip_bytes, meta = build_zip_bytes(body.ir_bundle, engine_mode=body.engine_mode)
    if not meta.get("ok") or not zip_bytes:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "meta": meta, "message": "Materialize or zip build failed"},
        )
    hint_payload = {
        "written_count": len(meta.get("written", [])),
        "paths_preview": (meta.get("written") or [])[:20],
        "local_webapp": meta.get("local_webapp"),
    }
    meta_b64 = base64.urlsafe_b64encode(json.dumps(hint_payload, separators=(",", ":")).encode()).decode(
        "ascii"
    )
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="torqa-generated.zip"',
            "X-TORQA-Generated-Count": str(len(meta.get("written", []))),
            "X-TORQA-Materialize-Meta": meta_b64,
        },
    )


@app.post("/api/compile-tq")
def api_compile_tq(body: TqCompileRequest):
    from src.surface.parse_tq import TQParseError, parse_tq_source

    try:
        bundle = parse_tq_source(body.source)
    except TQParseError as ex:
        extra = tq_parse_extras(ex.code)
        return {
            "ok": False,
            "code": ex.code,
            "message": str(ex),
            "hint": extra.get("hint"),
            "doc": extra.get("doc"),
            "ir_bundle": None,
            "diagnostics": None,
        }
    try:
        ir_goal = ir_goal_from_json(bundle)
    except (KeyError, TypeError) as ex:
        rep = build_ir_shape_error_report(ex)
        rep["suggested_next"] = suggested_next_from_report(rep)
        return {
            "ok": False,
            "code": "PX_PARSE_FAILED",
            "message": rep["issues"][0]["message"],
            "ir_bundle": bundle,
            "diagnostics": rep,
        }
    rep = build_full_diagnostic_report(
        ir_goal,
        bundle_envelope_errors=_bundle_envelope_errors(bundle),
    )
    return {
        "ok": rep["ok"],
        "code": None,
        "message": None,
        "ir_bundle": bundle,
        "diagnostics": rep,
    }


@app.post("/api/diagnostics")
def api_diagnostics(body: RunRequest):
    try:
        ir_goal = ir_goal_from_json(body.ir_bundle)
    except Exception as ex:
        raise HTTPException(400, f"IR parse failed: {ex}") from ex
    return build_full_diagnostic_report(
        ir_goal,
        bundle_envelope_errors=_bundle_envelope_errors(body.ir_bundle),
    )


@app.post("/api/ir/patch")
def api_ir_patch(body: PatchRequest):
    try:
        ir_goal = ir_goal_from_json(body.ir_bundle)
    except Exception as ex:
        raise HTTPException(400, f"IR parse failed: {ex}") from ex
    new_goal, err = try_apply_ir_mutations_from_json(ir_goal, body.mutations)
    if err:
        raise HTTPException(400, err)
    rep = build_full_diagnostic_report(
        new_goal,
        bundle_envelope_errors=_bundle_envelope_errors(body.ir_bundle),
    )
    return {
        "ok": rep["ok"],
        "ir_bundle": ir_goal_to_json(new_goal),
        "diagnostics": rep,
    }


@app.post("/api/quality")
def api_quality(body: RunRequest):
    try:
        ir_goal = ir_goal_from_json(body.ir_bundle)
    except Exception as ex:
        raise HTTPException(400, f"IR parse failed: {ex}") from ex
    return build_ir_quality_report(ir_goal)


@app.post("/api/explain")
def api_explain(body: RunRequest):
    try:
        ir_goal = ir_goal_from_json(body.ir_bundle)
    except Exception as ex:
        raise HTTPException(400, f"IR parse failed: {ex}") from ex
    return explain_ir_goal(ir_goal)


@app.post("/api/strategy")
def api_strategy(body: RunRequest):
    try:
        ir_goal = ir_goal_from_json(body.ir_bundle)
    except Exception as ex:
        raise HTTPException(400, f"IR parse failed: {ex}") from ex
    reg = default_ir_function_registry()
    sem = build_ir_semantic_report(ir_goal, reg)
    return explain_projection_strategy(ir_goal, sem, None, ProjectionContext())


@app.post("/api/preview-patch")
def api_preview_patch(body: PatchRequest):
    try:
        ir_goal = ir_goal_from_json(body.ir_bundle)
    except Exception as ex:
        raise HTTPException(400, f"IR parse failed: {ex}") from ex
    return build_patch_preview_report(ir_goal, body.mutations)


@app.post("/api/system-health")
def api_system_health(body: SystemHealthRequest):
    try:
        ir_goal = ir_goal_from_json(body.ir_bundle)
    except Exception as ex:
        raise HTTPException(400, f"IR parse failed: {ex}") from ex
    return build_system_health_report(
        ir_goal,
        demo_inputs=dict(body.demo_inputs or {}),
        engine_mode=body.engine_mode,
        include_parity=not body.skip_parity,
    )


@app.post("/api/ai/suggest")
def api_ai_suggest(body: AISuggestRequest):
    _LOG.info("AI suggest request (prompt length=%s)", len(body.prompt))
    return suggest_ir_bundle_from_prompt(
        body.prompt,
        max_retries=body.max_retries,
        model=body.model,
    )


@app.post("/api/run")
def run_pipeline(body: RunRequest):
    try:
        ir_goal = ir_goal_from_json(body.ir_bundle)
    except Exception as ex:
        raise HTTPException(400, f"IR parse failed: {ex}") from ex

    return build_console_run_payload(
        ir_goal,
        dict(body.demo_inputs or {}),
        engine_mode=body.engine_mode,
        bundle_envelope_errors=_bundle_envelope_errors(body.ir_bundle),
    )
