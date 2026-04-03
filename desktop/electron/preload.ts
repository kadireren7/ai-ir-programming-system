import { contextBridge, ipcRenderer } from "electron";
import type { TorqaRequest } from "./torqaTypes";

contextBridge.exposeInMainWorld("torqaShell", {
  getPaths: () => ipcRenderer.invoke("app:getPaths") as Promise<{ repoRoot: string; pythonExe: string }>,
  getWorkspace: () => ipcRenderer.invoke("workspace:get") as Promise<string | null>,
  openWorkspace: () => ipcRenderer.invoke("workspace:open") as Promise<string | null>,
  clearWorkspace: () => ipcRenderer.invoke("workspace:clear"),
  listTqFiles: (root: string) => ipcRenderer.invoke("fs:listTq", root) as Promise<string[]>,
  readFile: (root: string, relPath: string) =>
    ipcRenderer.invoke("fs:read", root, relPath) as Promise<string>,
  saveFile: (root: string, relPath: string, content: string) =>
    ipcRenderer.invoke("fs:write", root, relPath, content) as Promise<void>,
  torqaRun: (req: TorqaRequest) => ipcRenderer.invoke("torqa:run", req),
  seedSampleTq: (workspace: string, which: "minimal" | "flagship") =>
    ipcRenderer.invoke("demo:seedTq", workspace, which) as Promise<
      { ok: true; relativePath: string } | { ok: false; error: string }
    >,
});
