from __future__ import annotations

from typing import Any, Dict, List, Sequence, Tuple

from src.ir.canonical_ir import IRGoal
from src.projection.projection_strategy import ProjectionPlan, ProjectionTarget
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
        "V6.2 threshold requires a minimal website-capable artifact set.",
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
    website_files = [
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
    ]
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
    if lang == "rust":
        files = [
            (
                "generated/rust/main.rs",
                ir_goal_rust_projection(goal),
            )
        ]
    elif lang == "python":
        files = [
            (
                "generated/python/main.py",
                ir_goal_python_projection(goal),
            )
        ]
    elif lang == "sql":
        files = [("generated/sql/schema.sql", ir_goal_sql_projection(goal))]
    elif lang == "typescript":
        files = [
            (
                "generated/typescript/index.ts",
                ir_goal_typescript_index_projection(goal),
            )
        ]
    elif lang == "go":
        files = [("generated/go/main.go", ir_goal_go_projection(goal))]
    elif lang == "kotlin":
        files = [("generated/kotlin/Main.kt", ir_goal_kotlin_projection(goal))]
    else:
        files = [("generated/cpp/main.cpp", ir_goal_cpp_projection(goal))]
    return {
        "target_language": lang,
        "purpose": purpose,
        "files": [{"filename": fn, "content": content} for fn, content in files],
    }


def _generate_website_artifact(goal: IRGoal, plan: Dict[str, Any]) -> Dict[str, Any]:
    goal_title = goal.goal or "Generated Website"
    page_names = [i.name for i in goal.inputs[:3]]
    form_fields = "\n".join(
        [f"        <label>{name}<input name=\"{name}\" /></label>" for name in page_names]
    ) or '        <label>username<input name="username" /></label>'
    has_transitions = len(goal.transitions) > 0
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
            """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated app</title>
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
            f"# {goal_title} Web App\n\n"
            "Generated by V6.2 projection/codegen threshold.\n\n"
            "## Run\n\n"
            "```bash\n"
            "npm install\n"
            "npm run dev\n"
            "```\n",
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
            f"""import React from "react";
import {{ LandingPage }} from "./pages/LandingPage";
import {{ LoginPage }} from "./pages/LoginPage";
import {{ DashboardPage }} from "./pages/DashboardPage";

export function App() {{
  return (
    <main className="app-shell">
      <h1>{goal_title}</h1>
      <LandingPage />
      <LoginPage />
      <DashboardPage />
    </main>
  );
}}
""",
        ),
        (
            "generated/webapp/src/pages/LandingPage.tsx",
            """import React from "react";

export function LandingPage() {
  return <section><h2>Landing</h2><p>Generated landing page.</p></section>;
}
""",
        ),
        (
            "generated/webapp/src/pages/LoginPage.tsx",
            f"""import React from "react";

export function LoginPage() {{
  return (
    <section>
      <h2>Login</h2>
      <form>
{form_fields}
        <button type="submit">Sign In</button>
      </form>
    </section>
  );
}}
""",
        ),
        (
            "generated/webapp/src/pages/DashboardPage.tsx",
            """import React from "react";

export function DashboardPage() {
  return <section><h2>Dashboard</h2><p>Skeleton dashboard view.</p></section>;
}
""",
        ),
        (
            "generated/webapp/src/styles.css",
            """.app-shell { font-family: Arial, sans-serif; max-width: 900px; margin: 2rem auto; }
section { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
label { display: block; margin-bottom: 0.5rem; }
input { margin-left: 0.5rem; }
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
