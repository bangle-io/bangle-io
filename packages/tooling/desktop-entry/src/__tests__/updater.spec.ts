import { describe, expect, it, vi } from 'vitest';
import { type ConfigureUpdaterOptions, configureAutoUpdater } from '../updater';

function makeUpdater() {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const updater = {
    allowPrerelease: false,
    autoDownload: true,
    autoInstallOnAppQuit: true,
    channel: '',
    checkForUpdates: vi.fn(() => Promise.resolve()),
    downloadUpdate: vi.fn(() => Promise.resolve()),
    on: vi.fn((eventName: string, handler: (...args: unknown[]) => void) => {
      handlers.set(eventName, handler);
    }),
    quitAndInstall: vi.fn(),
    setFeedURL: vi.fn(),
  };

  return {
    handlers,
    updater: updater as unknown as ConfigureUpdaterOptions['autoUpdater'],
  };
}

describe('desktop updater', () => {
  it('skips update checks for unpackaged local development', () => {
    const { updater } = makeUpdater();

    configureAutoUpdater({
      app: { getVersion: () => '1.2.3', isPackaged: false },
      autoUpdater: updater,
      dialog: { showMessageBox: vi.fn() },
      getMainWindow: () => null,
      logger: console,
    });

    expect(updater.setFeedURL).not.toHaveBeenCalled();
  });

  it('selects the nightly GitHub release channel from the app version', () => {
    const { updater } = makeUpdater();

    configureAutoUpdater({
      app: {
        getVersion: () => '1.2.4-nightly.20260701.17',
        isPackaged: true,
      },
      autoUpdater: updater,
      dialog: { showMessageBox: vi.fn() },
      getMainWindow: () => null,
      setInterval: vi.fn() as never,
      setTimeout: vi.fn() as never,
    });

    expect(updater.channel).toBe('nightly');
    expect(updater.allowPrerelease).toBe(true);
    expect(updater.autoDownload).toBe(false);
    expect(updater.autoInstallOnAppQuit).toBe(false);
    expect(updater.setFeedURL).toHaveBeenCalledWith({
      provider: 'github',
      owner: 'bangle-io',
      repo: 'bangle-io',
      channel: 'nightly',
    });
  });

  it('prompts before downloading and installing an update', async () => {
    const { handlers, updater } = makeUpdater();
    const showMessageBox = vi
      .fn()
      .mockResolvedValueOnce({ response: 1 })
      .mockResolvedValueOnce({ response: 1 });

    configureAutoUpdater({
      app: { getVersion: () => '1.2.3', isPackaged: true },
      autoUpdater: updater,
      dialog: { showMessageBox },
      getMainWindow: () => null,
      setInterval: vi.fn() as never,
      setTimeout: vi.fn() as never,
    });

    handlers.get('update-available')?.();
    await vi.waitFor(() => {
      expect(updater.downloadUpdate).toHaveBeenCalled();
    });

    handlers.get('update-downloaded')?.();
    await vi.waitFor(() => {
      expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
    });
  });
});
