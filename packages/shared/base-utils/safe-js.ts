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
