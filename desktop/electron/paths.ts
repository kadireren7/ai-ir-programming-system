import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Directory containing compiled main (e.g. …/desktop/dist-electron). */
export function mainDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

/**
 * TORQA repository root (contains pyproject.toml with torqa project).
 * Override with TORQA_REPO_ROOT.
 */
export function resolveRepoRoot(): string {
  const env = process.env.TORQA_REPO_ROOT;
  if (env) return path.resolve(env);

  let cur = mainDir();
  for (let i = 0; i < 12; i++) {
    const manifest = path.join(cur, "pyproject.toml");
    if (fs.existsSync(manifest)) {
      try {
        const txt = fs.readFileSync(manifest, "utf8");
        if (txt.includes('name = "torqa"') || txt.includes("name = 'torqa'")) {
          return cur;
        }
      } catch {
        /* skip */
      }
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  return path.resolve(mainDir(), "..", "..");
}

export function resolvePythonExe(): string {
  return process.env.TORQA_PYTHON ?? (process.platform === "win32" ? "python" : "python3");
}
