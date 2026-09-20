import type { Atom, createStore } from 'jotai';
import { UsageTracker } from './usage-tracker';

/**
 * Measures daily reading and successful edits without inspecting notes or editor
 * markup. The host supplies settings and editor signals; abort releases all
 * subscriptions, browser listeners, timers and pending requests.
 */
export function startUsageTracking({
  store,
  enabled,
  isNoteReady,
  subscribeToSavedEdits,
  signal,
}: {
  store: Pick<ReturnType<typeof createStore>, 'get' | 'sub'>;
  enabled: Atom<boolean>;
  isNoteReady: () => boolean;
  subscribeToSavedEdits: (listener: () => void) => () => void;
  signal: AbortSignal;
}): void {
  if (signal.aborted) return;

  const lifetime = new AbortController();
  const cleanups: (() => void)[] = [];
  const stop = () => {
    lifetime.abort();
    for (const cleanup of cleanups.splice(0)) cleanup();
    signal.removeEventListener('abort', stop);
  };
  signal.addEventListener('abort', stop, { once: true });

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
    cleanups.push(() => tracker.destroy());
    tracker.setEnabled(store.get(enabled));
    let lastInteraction = Number.NEGATIVE_INFINITY;
    let readingMs = 0;
    let lastTick = performance.now();
    const resetActivity = () => {
      lastTick = performance.now();
      readingMs = 0;
      lastInteraction = Number.NEGATIVE_INFINITY;
    };
    cleanups.push(
      store.sub(enabled, () => {
        resetActivity();
        tracker.setEnabled(store.get(enabled));
      }),
    );
    const interact = (event: Event) => {
      if (event.isTrusted && document.visibilityState === 'visible')
        lastInteraction = performance.now();
    };
    for (const event of ['pointerdown', 'keydown', 'wheel']) {
      document.addEventListener(event, interact, {
        passive: true,
        capture: true,
        signal: lifetime.signal,
      });
    }
    document.addEventListener('visibilitychange', resetActivity, {
      signal: lifetime.signal,
    });
    cleanups.push(
      subscribeToSavedEdits(() => {
        if (performance.now() - lastInteraction < 60_000)
          void tracker.record('edited');
      }),
    );
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(now - lastTick, 5_000);
      lastTick = now;
      if (
        !store.get(enabled) ||
        document.visibilityState !== 'visible' ||
        !isNoteReady() ||
        now - lastInteraction >= 60_000
      ) {
        readingMs = 0;
        return;
      }
      readingMs += elapsed;
      if (readingMs >= 30_000) void tracker.record('read');
    }, 5_000);
    cleanups.push(() => clearInterval(timer));
  } catch {
    // A partial setup must neither prevent startup nor leave tracking running.
    stop();
  }
}
