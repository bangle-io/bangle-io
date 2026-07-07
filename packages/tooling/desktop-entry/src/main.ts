import { access, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import { APP_PROTOCOL, APP_URL } from './protocol';
import { registerAppProtocol as registerDesktopAppProtocol } from './protocol-handler';
import { createDesktopFileStore, registerRemoteFsIpc } from './remote-fs';
import { configureAutoUpdater } from './updater';
import {
  getBrowserWindowOptions,
  installDesktopDocumentMarker,
  installExternalLinkHandlers,
} from './window';

const mainDir = dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function resolveBrowserDistDir(): string {
  const override = process.env.BANGLE_DESKTOP_BROWSER_DIST?.trim();
  if (override) {
    return resolve(override);
  }

  if (app.isPackaged) {
    return join(process.resourcesPath, 'browser-entry');
  }

  return resolve(mainDir, '..', '..', 'browser-entry', 'dist');
}

async function assertBrowserDist(browserDistDir: string): Promise<void> {
  await access(join(browserDistDir, 'index.html'));
}

function ensureAppProtocolRegistered(browserDistDir: string): void {
  registerDesktopAppProtocol({
    browserDistDir,
    net,
    protocol,
    logger: console,
  });
}

function resolveWorkspaceRoot(): string {
  const override = process.env.BANGLE_DESKTOP_WORKSPACE_ROOT?.trim();
  if (override) {
    return resolve(override);
  }
  return join(app.getPath('userData'), 'workspaces');
}

// Host the file store in the main process and expose it over IPC. The renderer
// reads/writes local notes through the same protocol used for remote servers.
async function setupRemoteFs(): Promise<void> {
  const root = resolveWorkspaceRoot();
  await mkdir(root, { recursive: true });
  registerRemoteFsIpc({ ipcMain, store: createDesktopFileStore(root) });
  console.log(`[desktop] remote-fs backend rooted at ${root}`);
}

async function createMainWindow(): Promise<BrowserWindow> {
  const browserDistDir = resolveBrowserDistDir();
  await assertBrowserDist(browserDistDir);
  ensureAppProtocolRegistered(browserDistDir);

  const window = new BrowserWindow(
    getBrowserWindowOptions(join(mainDir, 'preload.cjs')),
  );
  mainWindow = window;

  installExternalLinkHandlers({
    webContents: window.webContents,
    openExternal: shell.openExternal,
  });
  installDesktopDocumentMarker({
    webContents: window.webContents,
    platform: process.platform,
  });

  window.once('ready-to-show', () => {
    window.show();
  });
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  await window.loadURL(APP_URL);
  return window;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow();
  }
});

void app.whenReady().then(async () => {
  try {
    await setupRemoteFs();
    await createMainWindow();
    configureAutoUpdater({
      app,
      autoUpdater,
      dialog,
      getMainWindow: () => mainWindow,
      logger: console,
    });
  } catch (error) {
    console.error('[desktop] Failed to start Bangle.io desktop.', error);
    dialog.showErrorBox(
      'Bangle.io could not start',
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  }
});
