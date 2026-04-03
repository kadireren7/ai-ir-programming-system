import type { TorqaRequest, TorqaRunResult } from "./torqaApi";

export type TorqaShellAPI = {
  getPaths: () => Promise<{ repoRoot: string; pythonExe: string }>;
  getWorkspace: () => Promise<string | null>;
  openWorkspace: () => Promise<string | null>;
  clearWorkspace: () => Promise<void>;
  listTqFiles: (root: string) => Promise<string[]>;
  readFile: (root: string, relPath: string) => Promise<string>;
  saveFile: (root: string, relPath: string, content: string) => Promise<void>;
  torqaRun: (req: TorqaRequest) => Promise<TorqaRunResult>;
  seedSampleTq: (
    workspace: string,
    which: "minimal" | "flagship",
  ) => Promise<{ ok: true; relativePath: string } | { ok: false; error: string }>;
};

declare global {
  interface Window {
    torqaShell: TorqaShellAPI;
  }
}

export {};
