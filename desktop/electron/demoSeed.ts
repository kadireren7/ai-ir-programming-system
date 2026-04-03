import fs from "node:fs";
import path from "node:path";
import * as fsSafe from "./fsSafe";
import { resolveRepoRoot } from "./paths";

const REPO_REL: Record<"minimal" | "flagship", string> = {
  minimal: "examples/workspace_minimal/app.tq",
  flagship: "examples/benchmark_flagship/app.tq",
};

export type SeedResult = { ok: true; relativePath: string } | { ok: false; error: string };

export function seedSampleTq(workspaceRoot: string, which: "minimal" | "flagship"): SeedResult {
  const repo = resolveRepoRoot();
  const relSrc = REPO_REL[which].split("/").join(path.sep);
  const absSrc = path.join(repo, relSrc);
  if (!fs.existsSync(absSrc)) {
    return { ok: false, error: `Missing in repo: ${REPO_REL[which]}` };
  }
  const destRel =
    which === "minimal" ? "torqa_samples/minimal_app.tq" : "torqa_samples/flagship_app.tq";
  const absDest = path.join(workspaceRoot, destRel.split("/").join(path.sep));
  fsSafe.assertUnderWorkspace(workspaceRoot, absDest);
  fs.mkdirSync(path.dirname(absDest), { recursive: true });
  fs.copyFileSync(absSrc, absDest);
  return { ok: true, relativePath: destRel };
}
