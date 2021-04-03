import { SPLIT_SCREEN_MIN_WIDTH } from 'config/index';

/**
 * Based on idea from https://github.com/alexreardon/raf-schd
 * Throttles the function and calls it with the latest argument
 * @param {Function} fn
 */
export function rafSchedule(fn) {
  let lastArgs = [];
  let frameId = null;

  const wrapperFn = (...args) => {
    // Always capture the latest value
    lastArgs = args;

    // There is already a frame queued
    if (frameId) {
      return;
    }

    // Schedule a new frame
    frameId = requestAnimationFrame(() => {
      frameId = null;
      fn(...lastArgs);
    });
  };

  // Adding cancel property to result function
  wrapperFn.cancel = () => {
    if (!frameId) {
      return;
    }
    cancelAnimationFrame(frameId);
    frameId = null;
  };

  return wrapperFn;
}

export const checkWidescreen = (width = window.innerWidth) =>
  SPLIT_SCREEN_MIN_WIDTH <= width;
