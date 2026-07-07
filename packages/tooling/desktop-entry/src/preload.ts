import { DESKTOP_REMOTE_FS_IPC_CHANNEL } from '@bangle.io/constants';
import type {
  RemoteRequest,
  RemoteResponse,
} from '@bangle.io/remote-file-sync';
import { contextBridge, ipcRenderer } from 'electron';
import { markDesktopPlatform } from './desktop-document';

if (typeof document !== 'undefined') {
  markDesktopPlatform(document, process.platform);
}

contextBridge.exposeInMainWorld('bangleDesktop', {
  platform: process.platform,
  // Bridge remote file-storage requests to the main-process router. The
  // renderer's FileStorageRemote provider uses this instead of HTTP on desktop.
  remoteFs: {
    request: (req: RemoteRequest): Promise<RemoteResponse> =>
      ipcRenderer.invoke(DESKTOP_REMOTE_FS_IPC_CHANNEL, req),
  },
});
