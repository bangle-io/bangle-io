interface ElementWithScrollIntoViewIfNeeded extends HTMLElement {
  scrollIntoViewIfNeeded?(centerIfNeeded?: boolean): void;
}

export const safeScrollIntoViewIfNeeded = (
  element: HTMLElement,
  centerIfNeeded?: boolean,
) => {
  if (typeof window !== 'undefined') {
    return 'scrollIntoViewIfNeeded' in document.body
      ? (element as ElementWithScrollIntoViewIfNeeded).scrollIntoViewIfNeeded?.(
          centerIfNeeded,
        )
      : scrollIntoViewIfNeededPolyfill(element, centerIfNeeded);
  }

  return () => {
    /* noop */
  };
};

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

function scrollIntoViewIfNeededPolyfill(
  element: HTMLElement,
  centerIfNeeded2?: boolean,
) {
  const centerIfNeeded = centerIfNeeded2 !== false;

  const parentNode = element.parentNode;
  if (!parentNode) {
    return;
  }
  const parent = parentNode as HTMLElement;
  const parentComputedStyle = window.getComputedStyle(parent, null);
  const parentBorderTopWidth = Number.parseInt(
    parentComputedStyle.getPropertyValue('border-top-width'),
    10,
  );
  const parentBorderLeftWidth = Number.parseInt(
    parentComputedStyle.getPropertyValue('border-left-width'),
    10,
  );
  const overTop = element.offsetTop - parent.offsetTop < parent.scrollTop;
  const overBottom =
    element.offsetTop -
      parent.offsetTop +
      element.clientHeight -
      parentBorderTopWidth >
    parent.scrollTop + parent.clientHeight;
  const overLeft = element.offsetLeft - parent.offsetLeft < parent.scrollLeft;
  const overRight =
    element.offsetLeft -
      parent.offsetLeft +
      element.clientWidth -
      parentBorderLeftWidth >
    parent.scrollLeft + parent.clientWidth;
  const alignWithTop = overTop && !overBottom;

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

export async function safeNavigatorStorageGetDirectory() {
  if (!navigator?.storage) {
    return undefined;
  }

  return navigator.storage.getDirectory();
}
