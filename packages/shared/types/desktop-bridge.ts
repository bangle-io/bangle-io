import type { DatabaseQueryOptions } from './base-database';

/**
 * The configuration key/value bridge the Electron preload exposes to the
 * renderer as `window.bangleDesktop.configDb`. It mirrors the async subset of
 * `BaseAppDatabase` (get/getAll/put/delete) and is the IPC contract between the
 * desktop main process (owner of the on-disk store) and the renderer-side
 * `DesktopNativeDatabaseService`.
 *
 * Only structured-clone/JSON-serializable values ever cross this bridge; records
 * carrying a non-serializable value (e.g. a native-FS `FileSystemDirectoryHandle`)
 * are routed to IndexedDB by the renderer and never reach it.
 */
export interface DesktopConfigBridge {
  getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{ found: boolean; value: unknown }>;

  getAllEntries(options: DatabaseQueryOptions): Promise<unknown[]>;

  putEntry(
    key: string,
    value: unknown,
    options: DatabaseQueryOptions,
  ): Promise<void>;

  deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void>;
}

/**
 * The full surface exposed on `window.bangleDesktop` by the Electron preload.
 * `configDb` is optional so older desktop shells (which only exposed
 * `platform`) still satisfy the type.
 */
export interface DesktopBridge {
  platform: string;
  configDb?: DesktopConfigBridge;
}

export type WindowWithDesktopBridge = Window & {
  bangleDesktop?: DesktopBridge;
};
