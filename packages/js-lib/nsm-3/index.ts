import type { EffectScheduler } from '@nalanda/core';

export { assertSafeZodSchema } from './zod-helpers';
export * from '@nalanda/core';
export * as superJson from 'superjson';
export { z } from 'zod';

export function createManualEffectScheduler() {
  let manualCallbacksRegistry = new Set<() => Promise<void> | void>();

  const manualEffectScheduler: EffectScheduler = (cb, opts) => {
    manualCallbacksRegistry.add(cb);

    return () => {
      if (!manualCallbacksRegistry.has(cb)) {
        throw new Error('unknown callback');
      }
      manualCallbacksRegistry.delete(cb);
    };
  };

  return {
    manualCallbacksRegistry,
    manualEffectScheduler,
  };
}

export const zeroTimeoutScheduler: EffectScheduler = (cb, opts) => {
  const metadata = opts.metadata;
  const runImmediately = metadata.runImmediately;

  if (runImmediately) {
    queueMicrotask(() => {
      void cb();
    });
    return () => {
      // noop
    };
  }

  let id = setTimeout(() => void cb(), 0);

  return () => {
    clearTimeout(id);
  };
};

const hasIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window;

export const customBangleScheduler: EffectScheduler = (cb, opts) => {
  const metadata = opts.metadata;
  // TODO: remove this check once we have a more performant way
  if (
    Object.keys(metadata).length > 1 ||
    (Object.keys(metadata).length === 1 && !metadata.runImmediately)
  ) {
    throw new Error(
      `customBangleScheduler only supports metadata.runImmediately`,
    );
  }

  const runImmediately = metadata.runImmediately;

  if (runImmediately) {
    queueMicrotask(() => {
      void cb();
    });
    return () => {
      // noop
    };
  }

  if (hasIdleCallback) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const ref = window.requestIdleCallback(cb, {
      timeout: opts.maxWait,
    });
    return () => {
      window.cancelIdleCallback(ref);
    };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const ref = setTimeout(cb, opts.maxWait);
    return () => {
      clearTimeout(ref);
    };
  }
};
