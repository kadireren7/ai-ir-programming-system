import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import { homedir } from "node:os";
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

function dialogParent(): BrowserWindow | undefined {
  const w = mainWindow ?? BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (w && !w.isDestroyed()) return w;
  return undefined;
}

async function pickWorkspaceDirectory(): Promise<string | null> {
  const parent = dialogParent();
  const opts = {
    defaultPath: homedir(),
    properties: ["openDirectory" as const],
    title: "Open TORQA project folder",
  };
  const r = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts);
  if (r.canceled || !r.filePaths[0]) return null;
  workspaceRoot = r.filePaths[0];
  return workspaceRoot;
}

async function pickTqFile(): Promise<{ workspaceRoot: string; relativePath: string } | null> {
  const parent = dialogParent();
  const opts = {
    defaultPath: homedir(),
    title: "Open a .tq file",
    filters: [
      { name: "TORQA surface", extensions: ["tq"] },
      { name: "All files", extensions: ["*"] },
    ],
    properties: ["openFile" as const],
  };
  const r = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts);
  if (r.canceled || !r.filePaths[0]) return null;
  const abs = path.resolve(r.filePaths[0]);
  const dir = path.dirname(abs);
  const rel = path.relative(dir, abs).split(path.sep).join("/");
  workspaceRoot = dir;
  return { workspaceRoot: dir, relativePath: rel };
}

function notifyWorkspaceOpened(dir: string) {
  mainWindow?.webContents.send("shell:workspaceOpened", dir);
}

function notifyTqFileOpened(payload: { workspaceRoot: string; relativePath: string }) {
  mainWindow?.webContents.send("shell:tqFileOpened", payload);
}

function installMenu() {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{ label: app.name, submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }] }]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Folder…",
          accelerator: "CmdOrCtrl+Shift+O",
          click: async () => {
            const p = await pickWorkspaceDirectory();
            if (p) notifyWorkspaceOpened(p);
          },
        },
        {
          label: "Open .tq File…",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const r = await pickTqFile();
            if (r) notifyTqFileOpened(r);
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    title: "TORQA Desktop",
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("[TORQA Desktop] Preload failed:", preloadPath, error);
  });

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
  installMenu();
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

ipcMain.handle("workspace:open", () => pickWorkspaceDirectory());

ipcMain.handle("file:openTq", () => pickTqFile());

ipcMain.handle("workspace:clear", () => {
  workspaceRoot = null;
  return null;
});

ipcMain.handle("fs:listTq", async (_, root: string) => {
  try {
    return await fsSafe.listTqFiles(root);
  } catch {
    return [];
  }
});

ipcMain.handle("fs:read", async (_, root: string, relPath: string) => {
  try {
    const content = await fsSafe.readTextFile(root, relPath);
    return { ok: true as const, content };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
});

ipcMain.handle("fs:write", async (_, root: string, relPath: string, content: string) => {
  try {
    await fsSafe.writeTextFile(root, relPath, content);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
});

ipcMain.handle("torqa:run", async (_, req: TorqaRequest) => runTorqa(req));

ipcMain.handle(
  "demo:seedTq",
  async (_, workspace: string, which: "minimal" | "flagship") => seedSampleTq(workspace, which),
);
