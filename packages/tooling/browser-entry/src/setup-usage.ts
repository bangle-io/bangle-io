import { APP_ENV } from '@bangle.io/config';
import type {
  EditorSaveCoordinator,
  initializeServices,
} from '@bangle.io/initialize-services';
import type { createStore } from 'jotai';
import { UsageTracker } from './usage-tracker';

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
    const tracker = new UsageTracker({
      storage: window.localStorage,
      send: async (summary, requestSignal) => {
        const response = await fetch('/api/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(summary),
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: requestSignal,
        });
        // A missing Worker can fall through to the Pages SPA with HTTP 200.
        return response.status === 204;
      },
    });
    const preference = services.core.workbenchState.$usageAnalyticsEnabled;
    tracker.setEnabled(store.get(preference));
    let lastInteraction = Number.NEGATIVE_INFINITY;
    let readingMs = 0;
    let lastTick = performance.now();
    const unsubscribePreference = store.sub(preference, () => {
      readingMs = 0;
      lastInteraction = Number.NEGATIVE_INFINITY;
      tracker.setEnabled(store.get(preference));
    });
    const interact = (event: Event) => {
      if (event.isTrusted && document.visibilityState === 'visible')
        lastInteraction = performance.now();
    };
    for (const event of ['pointerdown', 'keydown', 'wheel']) {
      document.addEventListener(event, interact, {
        passive: true,
        capture: true,
        signal,
      });
    }
    document.addEventListener(
      'visibilitychange',
      () => {
        lastTick = performance.now();
        readingMs = 0;
        lastInteraction = Number.NEGATIVE_INFINITY;
      },
      { signal },
    );
    const unsubscribeSave = editorSaveCoordinator.subscribeSuccessfulSave(
      () => {
        if (performance.now() - lastInteraction < 60_000)
          void tracker.record('edited');
      },
    );
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(now - lastTick, 5_000);
      lastTick = now;
      const noteVisible =
        document.querySelector(
          '.ProseMirror, [data-editor-w-status="ready"]',
        ) !== null;
      if (
        !store.get(preference) ||
        document.visibilityState !== 'visible' ||
        !noteVisible ||
        now - lastInteraction >= 60_000
      ) {
        readingMs = 0;
        return;
      }
      readingMs += elapsed;
      if (readingMs >= 30_000) void tracker.record('read');
    }, 5_000);
    signal.addEventListener(
      'abort',
      () => {
        clearInterval(timer);
        unsubscribePreference();
        unsubscribeSave();
        tracker.destroy();
      },
      { once: true },
    );
  } catch {
    // Analytics setup must not prevent the editor from starting.
  }
}
