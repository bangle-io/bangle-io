import { APP_ENV } from '@bangle.io/config';
import type {
  EditorSaveCoordinator,
  initializeServices,
} from '@bangle.io/initialize-services';
import { startUsageTracking } from '@bangle.io/usage';
import type { createStore } from 'jotai';

/** Installs app-only activity measurement; previews and desktop stay excluded. */
export function setupUsage({
  services,
  store,
  editorSaveCoordinator,
  signal,
}: {
  services: Awaited<ReturnType<typeof initializeServices>>;
  store: ReturnType<typeof createStore>;
  editorSaveCoordinator: EditorSaveCoordinator;
  signal: AbortSignal;
}): void {
  const production =
    APP_ENV === 'production' &&
    window.location.origin === 'https://app.bangle.io';
  const testing =
    typeof __BANGLE_USAGE_TESTING__ !== 'undefined' &&
    __BANGLE_USAGE_TESTING__ &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search).get('usageTest') === 'true';
  if (
    (!production && !testing) ||
    signal.aborted ||
    (navigator.webdriver && !testing)
  )
    return;

  try {
    startUsageTracking({
      store,
      enabled: services.core.workbenchState.$usageAnalyticsEnabled,
      isNoteReady: () => services.core.editorEngine.hasReadyEditor(),
      subscribeToSavedEdits: (listener) =>
        editorSaveCoordinator.subscribeSuccessfulSave(listener),
      signal,
    });
  } catch {
    // Unavailable settings must not prevent the editor from starting.
  }
}
