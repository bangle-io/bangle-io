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
  let id = setTimeout(() => void cb(), 0);

  return () => {
    clearTimeout(id);
  };
};
