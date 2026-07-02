import { contextBridge } from 'electron';
import { markDesktopPlatform } from './desktop-document';

if (typeof document !== 'undefined') {
  markDesktopPlatform(document, process.platform);
}

contextBridge.exposeInMainWorld('bangleDesktop', {
  platform: process.platform,
});
