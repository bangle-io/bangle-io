import type { IpcMain } from 'electron';
import { CONFIG_IPC } from './config-channels';
import type { ConfigStore } from './config-store';

export interface RegisterConfigIpcInput {
  ipcMain: IpcMain;
  store: ConfigStore;
}

/**
 * Wires the config-store IPC channels. Handlers run in the main process and are
 * the only path the sandboxed renderer has to persistent native config, so they
 * validate their arguments defensively rather than trusting the renderer.
 */
export function registerConfigIpc(input: RegisterConfigIpcInput): void {
  const { ipcMain, store } = input;

  ipcMain.handle(
    CONFIG_IPC.getEntry,
    (_event, key: unknown, options: unknown) =>
      store.getEntry(assertKey(key), assertTableName(options)),
  );

  ipcMain.handle(CONFIG_IPC.getAllEntries, (_event, options: unknown) =>
    store.getAllEntries(assertTableName(options)),
  );

  ipcMain.handle(
    CONFIG_IPC.putEntry,
    (_event, key: unknown, value: unknown, options: unknown) =>
      store.putEntry(assertKey(key), value, assertTableName(options)),
  );

  ipcMain.handle(
    CONFIG_IPC.deleteEntry,
    (_event, key: unknown, options: unknown) =>
      store.deleteEntry(assertKey(key), assertTableName(options)),
  );
}

function assertKey(key: unknown): string {
  if (typeof key !== 'string') {
    throw new TypeError('Config key must be a string');
  }
  return key;
}

function assertTableName(options: unknown): string {
  if (
    typeof options !== 'object' ||
    options === null ||
    typeof (options as { tableName?: unknown }).tableName !== 'string'
  ) {
    throw new TypeError('Config options.tableName must be a string');
  }
  return (options as { tableName: string }).tableName;
}
