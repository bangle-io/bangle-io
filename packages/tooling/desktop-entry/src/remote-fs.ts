import { DESKTOP_REMOTE_FS_IPC_CHANNEL } from '@bangle.io/constants';
import { DiskRemoteFileStore } from '@bangle.io/remote-file-server';
import {
  createRemoteRouter,
  type RemoteFileStore,
  type RemoteRequest,
  type RemoteResponse,
  type RemoteRouter,
} from '@bangle.io/remote-file-sync';

/**
 * The subset of Electron's `ipcMain` this module needs. Declared structurally
 * so tests can pass a fake without importing electron.
 */
export interface IpcMainLike {
  handle(
    channel: string,
    listener: (event: unknown, req: RemoteRequest) => Promise<RemoteResponse>,
  ): void;
  removeHandler(channel: string): void;
}

/** Builds the disk-backed store the desktop app uses for local workspaces. */
export function createDesktopFileStore(rootDir: string): DiskRemoteFileStore {
  return new DiskRemoteFileStore(rootDir);
}

/**
 * Hosts a remote file-storage router in the Electron main process and exposes
 * it over IPC. The renderer's `FileStorageRemote` provider then reads and
 * writes through the same protocol it would use for an HTTP server — but the
 * bytes never leave the machine, and the main process owns the filesystem.
 *
 * Returns the router (useful for tests) and a disposer that removes the handler.
 */
export function registerRemoteFsIpc(input: {
  ipcMain: IpcMainLike;
  store: RemoteFileStore;
  token?: string;
  channel?: string;
}): { router: RemoteRouter; dispose: () => void } {
  const router = createRemoteRouter(input.store, {
    token: input.token,
    name: 'bangle-desktop',
  });
  const channel = input.channel ?? DESKTOP_REMOTE_FS_IPC_CHANNEL;
  input.ipcMain.handle(channel, async (_event, req) => router(req));
  return {
    router,
    dispose: () => input.ipcMain.removeHandler(channel),
  };
}
