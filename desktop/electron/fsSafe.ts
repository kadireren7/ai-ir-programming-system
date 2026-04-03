import fs from "node:fs/promises";
import path from "node:path";

export function assertUnderWorkspace(workspaceRoot: string, targetPath: string): void {
  const root = path.resolve(workspaceRoot);
  const target = path.resolve(targetPath);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path escapes workspace");
  }
}

export async function listTqFiles(workspaceRoot: string): Promise<string[]> {
  const root = path.resolve(workspaceRoot);
  const out: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 14) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full, depth + 1);
      else if (ent.isFile() && ent.name.toLowerCase().endsWith(".tq")) {
        out.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  }

  await walk(root, 0);
  return out.sort();
}

export async function readTextFile(workspaceRoot: string, relOrAbs: string): Promise<string> {
  const p = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(workspaceRoot, relOrAbs);
  assertUnderWorkspace(workspaceRoot, p);
  return fs.readFile(p, "utf8");
}

export async function writeTextFile(workspaceRoot: string, relOrAbs: string, content: string): Promise<void> {
  const p = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(workspaceRoot, relOrAbs);
  assertUnderWorkspace(workspaceRoot, p);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf8");
}
