import React from 'react';
import {
  getPwaInstallSnapshot,
  openPwaApp,
  promptPwaInstall,
  subscribePwaInstallPrompt,
} from './pwa-install';

/**
 * React view of the PWA install state plus the two actions the UI offers:
 * one-click install (deferred browser prompt) and launching the already
 * installed app from a browser tab.
 */
export function usePwaInstall() {
  const snapshot = React.useSyncExternalStore(
    subscribePwaInstallPrompt,
    getPwaInstallSnapshot,
    getPwaInstallSnapshot,
  );

  return React.useMemo(
    () => ({
      ...snapshot,
      install: () => promptPwaInstall(),
      openInApp: () => openPwaApp(),
    }),
    [snapshot],
  );
}
