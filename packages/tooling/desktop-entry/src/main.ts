import { access } from 'node:fs/promises';
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
import { registerConfigIpc } from './config-ipc';
import { ConfigStore } from './config-store';
import { APP_PROTOCOL, APP_URL } from './protocol';
import { registerAppProtocol as registerDesktopAppProtocol } from './protocol-handler';
import { configureAutoUpdater } from './updater';
import {
  getBrowserWindowOptions,
  installDesktopDocumentMarker,
  installExternalLinkHandlers,
} from './window';

const mainDir = dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;

/**
 * Registers the native config-store IPC once. The store persists desktop
 * configuration (workspace list + misc app config, never note content) under
 * the OS user-data directory, replacing the browser IndexedDB path for the
 * async `database` seam. Sync UI preferences remain on localStorage.
 */
function installConfigStore(): void {
  const store = new ConfigStore({
    dir: join(app.getPath('userData'), 'config'),
  });
  registerConfigIpc({ ipcMain, store });
}

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
    installConfigStore();
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
