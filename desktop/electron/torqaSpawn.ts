import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { TorqaRequest } from "./torqaTypes";
import { resolvePythonExe, resolveRepoRoot } from "./paths";
import * as fsSafe from "./fsSafe";

export type TorqaRunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function runProcess(
  repoRoot: string,
  pythonExe: string,
  args: string[],
  options?: { cwd?: string },
): Promise<TorqaRunResult> {
  return new Promise((resolve) => {
    const child = spawn(pythonExe, args, {
      cwd: options?.cwd ?? repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: repoRoot,
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8",
      },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c: string) => {
      stdout += c;
    });
    child.stderr.on("data", (c: string) => {
      stderr += c;
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: `${stderr}\n${String(err)}`,
      });
    });
  });
}

/** P31-style directory: can run ``torqa-compression-bench`` (via ``src.benchmarks.cli``). */
function isCompressionBenchDir(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, "BENCHMARK_TASK.md")) &&
    fs.existsSync(path.join(dir, "expected_output_summary.json")) &&
    fs.existsSync(path.join(dir, "app.tq"))
  );
}

export async function runTorqa(req: TorqaRequest): Promise<TorqaRunResult> {
  const repoRoot = resolveRepoRoot();
  const pythonExe = resolvePythonExe();
  const mod = ["-m", "torqa"];

  if (req.kind === "benchmark") {
    if (req.workspaceRoot && req.relativePath) {
      const ws = path.resolve(req.workspaceRoot);
      const rel = req.relativePath.split("/").join(path.sep);
      const filePath = path.join(ws, rel);
      try {
        fsSafe.assertUnderWorkspace(ws, filePath);
      } catch (e) {
        return {
          exitCode: 1,
          stdout: "",
          stderr: `Benchmark: invalid path — ${String(e)}`,
        };
      }
      const parent = path.dirname(filePath);
      if (isCompressionBenchDir(parent)) {
        const benchDir = path.resolve(parent);
        const args = [
          "-c",
          "import sys; from src.benchmarks.cli import main; raise SystemExit(main(sys.argv[1:]))",
          benchDir,
          "--repo-root",
          repoRoot,
          "--no-generated",
        ];
        return runProcess(repoRoot, pythonExe, args);
      }
    }
    const args = [...mod, "--json", "demo", "benchmark"];
    return runProcess(repoRoot, pythonExe, args);
  }

  const ws = path.resolve(req.workspaceRoot);
  const rel = req.relativePath.split("/").join(path.sep);
  const filePath = path.join(ws, rel);
  fsSafe.assertUnderWorkspace(ws, filePath);

  if (req.kind === "surface") {
    const args = [...mod, "--json", "surface", filePath];
    return runProcess(repoRoot, pythonExe, args);
  }

  const args = [
    ...mod,
    "--json",
    "build",
    filePath,
    "--root",
    ws,
    "--out",
    req.outDir ?? "torqa_generated_out",
    "--engine-mode",
    req.engineMode ?? "python_only",
  ];
  return runProcess(repoRoot, pythonExe, args);
}
