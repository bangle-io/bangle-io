import type { DesktopConfigBridge } from '@bangle.io/types';
import { contextBridge, ipcRenderer } from 'electron';
import { CONFIG_IPC } from './config-channels';
import { markDesktopPlatform } from './desktop-document';

const configDb: DesktopConfigBridge = {
  getEntry: (key, options) =>
    ipcRenderer.invoke(CONFIG_IPC.getEntry, key, options),
  getAllEntries: (options) =>
    ipcRenderer.invoke(CONFIG_IPC.getAllEntries, options),
  putEntry: (key, value, options) =>
    ipcRenderer.invoke(CONFIG_IPC.putEntry, key, value, options),
  deleteEntry: (key, options) =>
    ipcRenderer.invoke(CONFIG_IPC.deleteEntry, key, options),
};

// Expose the bridge first so nothing below can prevent the renderer from
// reaching native config.
contextBridge.exposeInMainWorld('bangleDesktop', {
  platform: process.platform,
  configDb,
});

if (typeof document !== 'undefined') {
  markDesktopPlatform(document, process.platform);
}
