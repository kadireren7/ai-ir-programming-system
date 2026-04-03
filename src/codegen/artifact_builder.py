from __future__ import annotations

import json
from html import escape as html_escape
from typing import Any, Dict, List, Sequence, Tuple

from src.ir.canonical_ir import IRGoal
from src.projection.projection_strategy import ProjectionPlan, ProjectionTarget
from src.projection.stub_paths_layout import effective_stub_paths_for_goal
from src.projection.extra_artifacts import merge_extra_projection_artifacts
from src.codegen.ir_to_projection import (
    ir_goal_cpp_projection,
    ir_goal_go_projection,
    ir_goal_kotlin_projection,
    ir_goal_python_projection,
    ir_goal_rust_projection,
    ir_goal_server_typescript_stub,
    ir_goal_sql_projection,
    ir_goal_typescript_index_projection,
)


WEBSITE_GENERATION_PROFILE: Dict[str, bool] = {
    "supports_pages": True,
    "supports_components": True,
    "supports_forms": True,
    "supports_basic_layout": True,
    "supports_previewable_structure": True,
}

# P21 — Webapp projection audit (deterministic Vite + React under ``generated/webapp/``).
# Always emitted: package.json, tsconfig.json, vite.config.ts, index.html, README.md,
# src/main.tsx (entry), src/App.tsx (shell + section nav), src/vite-env.d.ts, src/styles.css,
# src/pages/LandingPage.tsx, LoginPage.tsx, DashboardPage.tsx.
# Optional: src/server_stub.ts when ``IRGoal.transitions`` is non-empty.
# Prior gaps: README cited an internal threshold label; index title ignored the flow name;
# App.tsx stacked all sections (no shell); page copy read as generic placeholders.
WEBAPP_CORE_RELATIVE_PATHS: Tuple[str, ...] = (
    "generated/webapp/package.json",
    "generated/webapp/tsconfig.json",
    "generated/webapp/vite.config.ts",
    "generated/webapp/index.html",
    "generated/webapp/README.md",
    "generated/webapp/src/main.tsx",
    "generated/webapp/src/App.tsx",
    "generated/webapp/src/pages/LandingPage.tsx",
    "generated/webapp/src/pages/LoginPage.tsx",
    "generated/webapp/src/pages/DashboardPage.tsx",
    "generated/webapp/src/styles.css",
    "generated/webapp/src/vite-env.d.ts",
)

_WEBAPP_APP_TSX = """import React, { useState } from "react";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

type DemoView = "overview" | "login" | "dashboard";

export function App() {
  const flowName = __FLOW__;
  const flowResult = __FLOW_RESULT__;
  const [view, setView] = useState<DemoView>("overview");

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <span className="app-badge" aria-hidden="true">TORQA</span>
          <span className="app-header-meta">Generated preview</span>
        </div>
        <h1>{flowName}</h1>
        <p className="app-tagline">Local UI shell from your validated TORQA intent — not wired to a real backend.</p>
      </header>
      <nav className="app-nav" aria-label="Demo sections">
        <button
          type="button"
          className={view === "overview" ? "nav-item active" : "nav-item"}
          onClick={() => setView("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={view === "login" ? "nav-item active" : "nav-item"}
          onClick={() => setView("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={view === "dashboard" ? "nav-item active" : "nav-item"}
          onClick={() => setView("dashboard")}
        >
          After sign-in
        </button>
      </nav>
      <main className="app-main">
        {view === "overview" && <LandingPage flowName={flowName} />}
        {view === "login" && <LoginPage />}
        {view === "dashboard" && <DashboardPage flowResult={flowResult} />}
      </main>
      <footer className="app-footer-bar">
        <span className="footer-brand">TORQA</span>
        <span className="footer-note">Projection preview · run <code className="footer-code">npm run dev</code> in this folder</span>
      </footer>
    </div>
  );
}
"""


def _all_targets(plan: ProjectionPlan) -> List[ProjectionTarget]:
    return [plan.primary_target] + list(plan.secondary_targets)


def _target_key(target: ProjectionTarget) -> Tuple[str, str]:
    return (target.language.lower(), target.purpose.lower())


def _website_candidate_targets(plan: ProjectionPlan) -> List[ProjectionTarget]:
    out: List[ProjectionTarget] = []
    for t in _all_targets(plan):
        if t.language.lower() == "typescript" and t.purpose.lower() == "frontend_surface":
            out.append(t)
    return out


def _fallback_website_target(goal: IRGoal) -> ProjectionTarget:
    reasons = [
        "Projection emits a minimal website-capable demo bundle under generated/webapp/.",
        "No explicit TypeScript frontend target selected by strategy; fallback website target enabled.",
    ]
    if len(goal.inputs) >= 3:
        reasons.append("Input interaction level is sufficient for simple form generation.")
    return ProjectionTarget(
        language="typescript",
        purpose="frontend_surface",
        confidence=0.51,
        reasons=reasons,
        constraints={"source": "v6_2_website_threshold_fallback"},
    )


def build_generation_plan(ir_goal: IRGoal, projection_plan: ProjectionPlan) -> Dict[str, Any]:
    website_targets = _website_candidate_targets(projection_plan)
    selected: List[ProjectionTarget] = list(_all_targets(projection_plan))
    if not website_targets:
        website_fallback = _fallback_website_target(ir_goal)
        selected.append(website_fallback)
        website_targets = [website_fallback]

    website_ready = bool(ir_goal.goal and ir_goal.result is not None and len(ir_goal.inputs) > 0)
    frontend_target = website_targets[0]
    website_files = list(WEBAPP_CORE_RELATIVE_PATHS)
    if len(ir_goal.transitions) > 0:
        website_files.append("generated/webapp/src/server_stub.ts")

    return {
        "selected_targets": [
            {
                "language": t.language,
                "purpose": t.purpose,
                "confidence": t.confidence,
                "reasons": list(t.reasons),
            }
            for t in selected
        ],
        "website_generation_profile": dict(WEBSITE_GENERATION_PROFILE),
        "website_generation_ready": website_ready,
        "file_set": {
            "website_project": website_files,
        },
        "dependencies": {
            "website_project": [
                "react",
                "react-dom",
                "typescript",
                "vite",
                "@types/react",
                "@types/react-dom",
            ]
        },
        "artifact_ordering": [
            "project_config",
            "app_entry",
            "layout_and_pages",
            "style_layer",
            "optional_server_stub",
        ],
        "runtime_assumptions": {
            "node": ">=18",
            "package_manager": "npm",
            "browser_preview": True,
            "frontend_target": {
                "language": frontend_target.language,
                "purpose": frontend_target.purpose,
            },
        },
    }


def generate_stub_artifact(goal: IRGoal, target: ProjectionTarget) -> Dict[str, Any]:
    lang = target.language.lower()
    purpose = target.purpose
    paths = effective_stub_paths_for_goal(goal)
    if lang == "rust":
        content = ir_goal_rust_projection(goal)
        stub_key = "rust"
    elif lang == "python":
        content = ir_goal_python_projection(goal)
        stub_key = "python"
    elif lang == "sql":
        content = ir_goal_sql_projection(goal)
        stub_key = "sql"
    elif lang == "typescript":
        content = ir_goal_typescript_index_projection(goal)
        stub_key = "typescript"
    elif lang == "go":
        content = ir_goal_go_projection(goal)
        stub_key = "go"
    elif lang == "kotlin":
        content = ir_goal_kotlin_projection(goal)
        stub_key = "kotlin"
    else:
        content = ir_goal_cpp_projection(goal)
        stub_key = "cpp"
    fn = paths.get(stub_key) or paths.get("cpp", "generated/cpp/main.cpp")
    files = [(fn, content)]
    return {
        "target_language": lang,
        "purpose": purpose,
        "files": [{"filename": f, "content": c} for f, c in files],
    }


def _generate_website_artifact(goal: IRGoal, plan: Dict[str, Any]) -> Dict[str, Any]:
    goal_title = goal.goal or "Generated Website"
    page_names = [i.name for i in goal.inputs[:3]]
    form_fields = "\n".join(
        (
            f'        <div className="field">\n'
            f'          <label htmlFor={json.dumps(n)}>{n}</label>\n'
            f'          <input id={json.dumps(n)} name={json.dumps(n)} '
            f'type="{"password" if n.lower() == "password" else "text"}" />\n'
            f"        </div>"
        )
        for n in page_names
    ) or (
        '        <div className="field">\n'
        '          <label htmlFor="username">username</label>\n'
        '          <input id="username" name="username" type="text" />\n'
        "        </div>"
    )
    has_transitions = len(goal.transitions) > 0
    flow_literal = json.dumps(goal_title)
    result_str = str(goal.result) if goal.result is not None else ""
    flow_result_literal = json.dumps(result_str)
    app_tsx = _WEBAPP_APP_TSX.replace("__FLOW__", flow_literal).replace("__FLOW_RESULT__", flow_result_literal)
    index_title = html_escape(goal_title)
    readme = (
        f"# {goal_title} — demo webapp\n\n"
        "This folder is produced by **TORQA** projection (Vite + React). "
        "Use it as a local preview baseline; API and auth are not wired here.\n\n"
        "## Run locally\n\n"
        "```bash\n"
        "npm install\n"
        "npm run dev\n"
        "```\n\n"
        "Open the URL Vite prints (often http://localhost:5173).\n"
    )
    files: List[Tuple[str, str]] = [
        (
            "generated/webapp/package.json",
            """{
  "name": "generated-webapp",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.6.3",
    "vite": "^5.4.8"
  }
}
""",
        ),
        (
            "generated/webapp/tsconfig.json",
            """{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
""",
        ),
        (
            "generated/webapp/vite.config.ts",
            """import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
""",
        ),
        (
            "generated/webapp/index.html",
            f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{index_title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""",
        ),
        (
            "generated/webapp/src/vite-env.d.ts",
            """/// <reference types="vite/client" />
""",
        ),
        (
            "generated/webapp/README.md",
            readme,
        ),
        (
            "generated/webapp/src/main.tsx",
            """import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
""",
        ),
        (
            "generated/webapp/src/App.tsx",
            app_tsx,
        ),
        (
            "generated/webapp/src/pages/LandingPage.tsx",
            """import React from "react";

export function LandingPage({ flowName }: { flowName: string }) {
  return (
    <section className="page" aria-labelledby="overview-title">
      <h2 id="overview-title">Overview</h2>
      <p>
        This screen is <strong>projected from TORQA</strong> for the <strong>{flowName}</strong> flow.
        Use the navigation above to step through a sign-in layout and the post-login view.
      </p>
      <ul className="page-list">
        <li>Structure and copy reflect your intent spec, not hand-written React.</li>
        <li>Forms are visual placeholders — hook them to your API when you ship.</li>
      </ul>
    </section>
  );
}
""",
        ),
        (
            "generated/webapp/src/pages/LoginPage.tsx",
            f"""import React from "react";

export function LoginPage() {{
  return (
    <section className="page" aria-labelledby="login-title">
      <h2 id="login-title">Sign in</h2>
      <form>
{form_fields}
        <button type="submit">Sign in</button>
      </form>
    </section>
  );
}}
""",
        ),
        (
            "generated/webapp/src/pages/DashboardPage.tsx",
            """import React from "react";

export function DashboardPage({ flowResult }: { flowResult: string }) {
  return (
    <section className="page page-dashboard" aria-labelledby="dash-title">
      <h2 id="dash-title">After sign-in</h2>
      <p className="flow-result-line">
        Declared flow result: <strong>{flowResult || "—"}</strong>
      </p>
      <p className="muted">Happy-path layout from your TORQA spec; connect real session and data in product code.</p>
    </section>
  );
}
""",
        ),
        (
            "generated/webapp/src/styles.css",
            """* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(160deg, #f0f4fa 0%, #e8ecf3 40%, #fff 100%);
  color: #0f172a;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}
.app-root {
  max-width: 840px;
  margin: 0 auto;
  padding: 1.75rem 1.25rem 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header-top {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}
.app-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
}
.app-header-meta {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.app-header h1 {
  margin: 0 0 0.35rem;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}
.app-tagline { margin: 0; color: #475569; font-size: 0.95rem; max-width: 52ch; }
.app-nav {
  display: flex;
  gap: 0.4rem;
  margin: 1.35rem 0 1rem;
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}
.app-nav .nav-item {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
  transition: background 0.15s, border-color 0.15s;
}
.app-nav .nav-item:hover {
  background: #fff;
  border-color: rgba(37, 99, 235, 0.35);
}
.app-nav .nav-item.active {
  border-color: #2563eb;
  background: #fff;
  color: #1e40af;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
}
.app-main {
  flex: 1;
}
.app-main .page {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  padding: 1.25rem 1.35rem;
  background: #fff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
}
.app-main .page h2 { margin-top: 0; font-size: 1.15rem; }
.page-list { margin: 0.75rem 0 0; padding-left: 1.25rem; color: #475569; font-size: 0.9rem; }
.page-list li { margin-bottom: 0.35rem; }
.flow-result-line { font-size: 1rem; margin: 0 0 0.75rem; }
.field { margin-bottom: 0.85rem; }
.field label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.3rem; color: #334155; }
.field input {
  width: 100%;
  max-width: 22rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 8px;
  font: inherit;
}
.muted { color: #64748b; font-size: 0.9rem; }
button[type="submit"] {
  margin-top: 0.5rem;
  padding: 0.5rem 1.1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
}
button[type="submit"]:hover { filter: brightness(1.05); }
.app-footer-bar {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  font-size: 0.8rem;
  color: #64748b;
}
.footer-brand {
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #2563eb;
}
.footer-code { font-size: 0.75rem; padding: 0.1em 0.35em; background: #f1f5f9; border-radius: 4px; }
""",
        ),
    ]
    if has_transitions:
        files.append(
            (
                "generated/webapp/src/server_stub.ts",
                ir_goal_server_typescript_stub(goal),
            )
        )
    return {
        "target_language": "typescript",
        "purpose": "frontend_surface",
        "generation_profile": dict(plan.get("website_generation_profile", {})),
        "files": [{"filename": fn, "content": content} for fn, content in files],
    }


def validate_generated_artifacts(artifacts: Sequence[Dict[str, Any]]) -> List[str]:
    errors: List[str] = []
    seen: set = set()
    has_entrypoint = False
    critical_empty: List[str] = []
    for idx, art in enumerate(artifacts):
        files = art.get("files")
        if not isinstance(files, list) or not files:
            errors.append(f"Artifact #{idx} has no files.")
            continue
        for f in files:
            fn = str(f.get("filename", "")).strip()
            content = f.get("content")
            if not fn:
                errors.append(f"Artifact #{idx} has file with missing filename.")
                continue
            if fn in seen:
                errors.append(f"Duplicate output filename detected: {fn}")
            seen.add(fn)
            if not isinstance(content, str):
                errors.append(f"File content must be string for: {fn}")
                continue
            if fn.endswith(("package.json", "tsconfig.json", "src/main.tsx", "src/App.tsx")) and not content.strip():
                critical_empty.append(fn)
            if fn.endswith("src/main.tsx"):
                has_entrypoint = True
    if not has_entrypoint:
        errors.append("Minimal website entrypoint missing: src/main.tsx")
    if critical_empty:
        errors.append(f"Critical files are empty: {sorted(critical_empty)}")
    return errors


def can_generate_simple_website(
    ir_goal: IRGoal, projection_plan: ProjectionPlan, artifacts: Sequence[Dict[str, Any]]
) -> Dict[str, Any]:
    _ = ir_goal
    reasons: List[str] = []
    missing_capabilities: List[str] = []
    has_frontend_target = any(
        t.language.lower() == "typescript" and t.purpose.lower() == "frontend_surface"
        for t in _all_targets(projection_plan)
    ) or any(a.get("purpose") == "frontend_surface" for a in artifacts)
    if not has_frontend_target:
        missing_capabilities.append("frontend_surface_projection")
        reasons.append("No TypeScript frontend_surface target available.")
    file_names = {
        str(f.get("filename", "")).strip()
        for a in artifacts
        for f in (a.get("files") or [])
    }
    required = {
        "generated/webapp/package.json",
        "generated/webapp/tsconfig.json",
        "generated/webapp/vite.config.ts",
        "generated/webapp/index.html",
        "generated/webapp/src/main.tsx",
        "generated/webapp/src/App.tsx",
    }
    missing_files = sorted(required - file_names)
    if missing_files:
        missing_capabilities.append("website_file_output")
        reasons.append(f"Missing required website files: {missing_files}")
    quality_errors = validate_generated_artifacts(artifacts)
    if quality_errors:
        missing_capabilities.append("artifact_quality")
        reasons.extend(quality_errors[:3])
    passed = (not missing_files) and has_frontend_target and (len(quality_errors) == 0)
    return {
        "passed": passed,
        "reasons": reasons if not passed else ["Simple website generation threshold passed."],
        "missing_capabilities": sorted(set(missing_capabilities)),
    }


def generate_all_artifacts(ir_goal: IRGoal, projection_plan: ProjectionPlan) -> List[Dict[str, Any]]:
    plan = build_generation_plan(ir_goal, projection_plan)
    artifacts: List[Dict[str, Any]] = [_generate_website_artifact(ir_goal, plan)]
    website_key = ("typescript", "frontend_surface")
    for t in _all_targets(projection_plan):
        if _target_key(t) == website_key:
            continue
        artifacts.append(generate_stub_artifact(ir_goal, t))
    return merge_extra_projection_artifacts(ir_goal, projection_plan, artifacts)
