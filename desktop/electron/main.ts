import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as fsSafe from "./fsSafe";
import { resolvePythonExe, resolveRepoRoot } from "./paths";
import { runTorqa } from "./torqaSpawn";
import { seedSampleTq } from "./demoSeed";
import type { TorqaRequest } from "./torqaTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let workspaceRoot: string | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    title: "TORQA Desktop",
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (process.env.TORQA_DESKTOP_DEVTOOLS === "1") {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app:getPaths", () => ({
  repoRoot: resolveRepoRoot(),
  pythonExe: resolvePythonExe(),
}));

ipcMain.handle("workspace:get", () => workspaceRoot);

ipcMain.handle("workspace:open", async () => {
  const r = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory"],
    title: "Open TORQA project folder",
  });
  if (r.canceled || !r.filePaths[0]) return null;
  workspaceRoot = r.filePaths[0];
  return workspaceRoot;
});

ipcMain.handle("workspace:clear", () => {
  workspaceRoot = null;
  return null;
});

ipcMain.handle("fs:listTq", async (_, root: string) => fsSafe.listTqFiles(root));

ipcMain.handle("fs:read", async (_, root: string, relPath: string) =>
  fsSafe.readTextFile(root, relPath),
);

ipcMain.handle("fs:write", async (_, root: string, relPath: string, content: string) => {
  await fsSafe.writeTextFile(root, relPath, content);
});

ipcMain.handle("torqa:run", async (_, req: TorqaRequest) => runTorqa(req));

ipcMain.handle(
  "demo:seedTq",
  async (_, workspace: string, which: "minimal" | "flagship") => seedSampleTq(workspace, which),
);
