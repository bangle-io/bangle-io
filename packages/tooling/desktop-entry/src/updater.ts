import type { App, BrowserWindow, Dialog, MessageBoxOptions } from 'electron';
import type { AppUpdater } from 'electron-updater';
import { resolveUpdateChannel } from './release-metadata';

const UPDATE_CHECK_DELAY_MS = 30_000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface ConfigureUpdaterOptions {
  readonly app: Pick<App, 'getVersion' | 'isPackaged'>;
  readonly autoUpdater: Pick<
    AppUpdater,
    | 'allowPrerelease'
    | 'autoDownload'
    | 'autoInstallOnAppQuit'
    | 'channel'
    | 'checkForUpdates'
    | 'downloadUpdate'
    | 'on'
    | 'quitAndInstall'
    | 'setFeedURL'
  >;
  readonly dialog: Pick<Dialog, 'showMessageBox'>;
  readonly getMainWindow: () => BrowserWindow | null;
  readonly logger?: Pick<Console, 'error' | 'info' | 'warn'>;
  readonly setInterval?: typeof globalThis.setInterval;
  readonly setTimeout?: typeof globalThis.setTimeout;
}

export function configureAutoUpdater(options: ConfigureUpdaterOptions): void {
  if (!options.app.isPackaged) {
    options.logger?.info?.('[desktop-updater] Skipping updates in dev mode.');
    return;
  }

  const version = options.app.getVersion();
  const channel = resolveUpdateChannel(version);
  const setTimeoutFn = options.setTimeout ?? globalThis.setTimeout;
  const setIntervalFn = options.setInterval ?? globalThis.setInterval;

  options.autoUpdater.autoDownload = false;
  options.autoUpdater.autoInstallOnAppQuit = false;
  options.autoUpdater.channel = channel;
  options.autoUpdater.allowPrerelease = channel === 'nightly';
  options.autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'bangle-io',
    repo: 'bangle-io',
    channel,
  });

  options.autoUpdater.on('error', (error) => {
    options.logger?.warn?.('[desktop-updater] Update check failed.', error);
  });

  options.autoUpdater.on('update-available', () => {
    void promptForDownload(options);
  });

  options.autoUpdater.on('update-downloaded', () => {
    void promptForInstall(options);
  });

  const checkForUpdates = () => {
    void options.autoUpdater.checkForUpdates().catch((error: unknown) => {
      options.logger?.warn?.(
        '[desktop-updater] Background update check failed.',
        error,
      );
    });
  };

  setTimeoutFn(checkForUpdates, UPDATE_CHECK_DELAY_MS);
  setIntervalFn(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
}

async function promptForDownload(
  options: ConfigureUpdaterOptions,
): Promise<void> {
  const window = options.getMainWindow();
  const dialogOptions: MessageBoxOptions = {
    type: 'info',
    buttons: ['Not Now', 'Download'],
    defaultId: 1,
    cancelId: 0,
    message: 'A Bangle.io update is available.',
    detail: 'Download it now and choose when to restart after it is ready.',
  };
  const result = window
    ? await options.dialog.showMessageBox(window, dialogOptions)
    : await options.dialog.showMessageBox(dialogOptions);

  if (result.response === 1) {
    await options.autoUpdater.downloadUpdate();
  }
}

async function promptForInstall(
  options: ConfigureUpdaterOptions,
): Promise<void> {
  const window = options.getMainWindow();
  const dialogOptions: MessageBoxOptions = {
    type: 'info',
    buttons: ['Later', 'Restart'],
    defaultId: 1,
    cancelId: 0,
    message: 'A Bangle.io update is ready.',
    detail: 'Restart Bangle.io to finish installing the update.',
  };
  const result = window
    ? await options.dialog.showMessageBox(window, dialogOptions)
    : await options.dialog.showMessageBox(dialogOptions);

  if (result.response === 1) {
    options.autoUpdater.quitAndInstall(false, true);
  }
}
