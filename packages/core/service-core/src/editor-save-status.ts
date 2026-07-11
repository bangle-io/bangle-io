/**
 * Waits for an editor engine's save queue to drain. Resolves `true` once no
 * pending or failed save remains, `false` when the timeout elapses first.
 *
 * Pending writes normally coalesce within milliseconds, so hitting the
 * timeout in practice means a save has failed and needs the user. The editor
 * contract intentionally exposes one conservative dirty-state signal, which
 * is why callers wait instead of refusing immediately.
 */
export function waitForSaveQueueToDrain(
  engine: {
    hasPendingOrFailedSave: () => boolean;
    subscribeToSaveStatus: (listener: () => void) => () => void;
  },
  timeoutMs: number,
): Promise<boolean> {
  if (!engine.hasPendingOrFailedSave()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (drained: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      unsubscribe?.();
      resolve(drained);
    };

    unsubscribe = engine.subscribeToSaveStatus(() => {
      if (!engine.hasPendingOrFailedSave()) {
        finish(true);
      }
    });
    if (settled) {
      // The listener fired synchronously during subscription.
      unsubscribe();
      return;
    }
    timer = setTimeout(
      () => finish(!engine.hasPendingOrFailedSave()),
      timeoutMs,
    );
    // The queue may have drained between the caller's first check and the
    // subscription above; without this re-check we would wait out the timeout.
    if (!engine.hasPendingOrFailedSave()) {
      finish(true);
    }
  });
}
