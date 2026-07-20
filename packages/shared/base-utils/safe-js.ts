let lastTime = 0;

export const safeRequestAnimationFrame =
  typeof window !== 'undefined' && window.requestAnimationFrame
    ? window.requestAnimationFrame
    : (callback: (r: number) => void) => {
        const currTime = Date.now();
        const timeToCall = Math.max(0, 16 - (currTime - lastTime));
        const id = window.setTimeout(() => {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;

        return id;
      };

export const safeCancelAnimationFrame =
  typeof window !== 'undefined' && window.cancelAnimationFrame
    ? window.cancelAnimationFrame
    : (id: Parameters<typeof cancelIdleCallback>[0]) => {
        clearTimeout(id);
      };

export const safeRequestIdleCallback: typeof requestIdleCallback =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb) => {
        const start = Date.now();

        return setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          });
        }, 1) as unknown as number;
      };

export const safeCancelIdleCallback: typeof cancelIdleCallback =
  typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback
    : (id) => {
        clearTimeout(id);
      };

/**
 * Based on idea from https://github.com/alexreardon/raf-schd
 * Throttles the function and calls it with the latest argument
 * @param {Function} fn
 */
export function rafSchedule<F, T extends (...args: F[]) => void>(fn: T) {
  let lastArgs: any[] = [];
  let frameId: null | number = null;

  const wrapperFn = (...args: F[]) => {
    // Always capture the latest value
    lastArgs = args;

    // There is already a frame queued
    if (frameId) {
      return;
    }

    // Schedule a new frame
    frameId = safeRequestAnimationFrame(() => {
      frameId = null;
      fn(...lastArgs);
    });
  };

  // Adding cancel property to result function
  wrapperFn.cancel = () => {
    if (!frameId) {
      return;
    }
    safeCancelAnimationFrame(frameId);
    frameId = null;
  };

  return wrapperFn;
}

export function safeIdleRefCallback(cb: () => void, timeout?: number) {
  safeRequestIdleCallback(
    () => {
      safeRequestAnimationFrame(() => {
        cb();
      });
    },
    { timeout },
  );
}

export async function safeNavigatorStorageGetDirectory() {
  if (!navigator?.storage) {
    return undefined;
  }

  return navigator.storage.getDirectory();
}
