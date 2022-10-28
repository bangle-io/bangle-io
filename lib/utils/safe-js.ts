export const safeScrollIntoViewIfNeeded = (
  element: HTMLElement,
  centerIfNeeded?: boolean,
) => {
  if (typeof window !== 'undefined') {
    return 'scrollIntoViewIfNeeded' in document.body
      ? (element as any).scrollIntoViewIfNeeded(centerIfNeeded)
      : scrollIntoViewIfNeededPolyfill(element, centerIfNeeded);
  }

  return () => {};
};

let lastTime = 0;

export const safeRequestAnimationFrame =
  typeof window !== 'undefined' && window.requestAnimationFrame
    ? window.requestAnimationFrame
    : function (callback: (r: number) => void) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function () {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;

        return id;
      };

export const safeCancelAnimationFrame =
  typeof window !== 'undefined' && window.cancelAnimationFrame
    ? window.cancelAnimationFrame
    : function (id: Parameters<typeof cancelIdleCallback>[0]) {
        clearTimeout(id);
      };

export const safeRequestIdleCallback: typeof requestIdleCallback =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : function (cb) {
        var start = Date.now();

        return setTimeout(function () {
          cb({
            didTimeout: false,
            timeRemaining: function () {
              return Math.max(0, 50 - (Date.now() - start));
            },
          });
        }, 1) as any;
      };

export const safeCancelIdleCallback: typeof cancelIdleCallback =
  typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback
    : function (id) {
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
    } else {
      safeCancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  return wrapperFn;
}

function scrollIntoViewIfNeededPolyfill(
  element: HTMLElement,
  centerIfNeeded?: boolean,
) {
  centerIfNeeded = arguments.length === 0 ? true : !!centerIfNeeded;

  var parent = element.parentNode! as HTMLElement,
    parentComputedStyle = window.getComputedStyle(parent, null),
    parentBorderTopWidth = parseInt(
      parentComputedStyle.getPropertyValue('border-top-width'),
    ),
    parentBorderLeftWidth = parseInt(
      parentComputedStyle.getPropertyValue('border-left-width'),
    ),
    overTop = element.offsetTop - parent.offsetTop < parent.scrollTop,
    overBottom =
      element.offsetTop -
        parent.offsetTop +
        element.clientHeight -
        parentBorderTopWidth >
      parent.scrollTop + parent.clientHeight,
    overLeft = element.offsetLeft - parent.offsetLeft < parent.scrollLeft,
    overRight =
      element.offsetLeft -
        parent.offsetLeft +
        element.clientWidth -
        parentBorderLeftWidth >
      parent.scrollLeft + parent.clientWidth,
    alignWithTop = overTop && !overBottom;

  if ((overTop || overBottom) && centerIfNeeded) {
    parent.scrollTop =
      element.offsetTop -
      parent.offsetTop -
      parent.clientHeight / 2 -
      parentBorderTopWidth +
      element.clientHeight / 2;
  }

  if ((overLeft || overRight) && centerIfNeeded) {
    parent.scrollLeft =
      element.offsetLeft -
      parent.offsetLeft -
      parent.clientWidth / 2 -
      parentBorderLeftWidth +
      element.clientWidth / 2;
  }

  if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
    element.scrollIntoView(alignWithTop);
  }
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

/**
 * Acquires a lock using the `ifAvailable` mode with the give `name`.
 * If the lock is not available returns without providing a lock.
 * If lock is available returns a callback which _must_ be called
 * once the lock is no longer needed.
 * If the callback takes a long time, it will throw an error.
 * @param name
 * @returns
 */
export async function acquireLockIfAvailable(
  name: string,
): Promise<(() => Promise<void>) | void> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return async () => {};
  }

  let lockPromise: Promise<void>;

  const releaseLock = await new Promise<(() => void) | null>(
    (exposeValue, reject) => {
      lockPromise = navigator.locks
        .request(
          name,
          {
            ifAvailable: true,
          },
          // The moment this promise resolves, the lock is release
          async (lock) => {
            // since we are using ifAvailable, if lock === null would mean
            // there is no lock available
            if (lock === null) {
              exposeValue(null);

              return;
            }

            await new Promise<void>((_releaseLock) => {
              // expose the `_releaseLock` callback externally so that
              // we can manually release the lock (see the cleanup function).
              // Note: calling `_releaseLock` will resolve this Promise
              // and hence the lock too will be released.
              exposeValue(_releaseLock);
            });
          },
        )
        .catch((error) => {
          reject(error);
        });
    },
  );

  // If the lock is not available, return without providing a lock
  if (!releaseLock) {
    return undefined;
  }

  const timer = setTimeout(() => {
    throw new Error(`Lock "${name}" held for too long! This is likely a bug.`);
  }, 60 * 1000);

  // This function should be called when the release of lock is needed
  return async () => {
    releaseLock();
    await lockPromise;
    clearTimeout(timer);
  };
}

export async function safeNavigatorStorageGetDirectory() {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return undefined;
  }

  return navigator.storage.getDirectory();
}
