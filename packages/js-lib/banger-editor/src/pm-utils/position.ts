// @vitest-environment jsdom

import type { EditorView } from 'prosemirror-view';

/**
 * A minimal "virtual element" interface compatible with floating-ui or similar libraries.
 */
export interface VirtualElement {
  getBoundingClientRect(): DOMRect;
}

/**
 * Creates a `VirtualElement` spanning from `start` to `end` in the given `EditorView`.
 * Useful for providing an anchor element to floating UI components.
 *
 * @param view The ProseMirror `EditorView`
 * @param start The document position where the range starts
 * @param end The document position where the range ends
 * @returns A `VirtualElement` or `null` if positions are invalid
 */
export function createVirtualElementFromRange(
  view: EditorView,
  start: number,
  end: number,
): VirtualElement | null {
  if (view.isDestroyed) {
    return null;
  }
  const coordsStart = view.coordsAtPos(start);
  if (!coordsStart) {
    return null;
  }
  const coordsEnd = view.coordsAtPos(end);
  if (!coordsEnd) {
    return null;
  }
  const left = Math.min(coordsStart.left, coordsEnd.left);
  const top = Math.min(coordsStart.top, coordsEnd.top);
  const right = Math.max(
    coordsStart.right ?? coordsStart.left,
    coordsEnd.right ?? coordsEnd.left,
  );
  const bottom = Math.max(coordsStart.bottom, coordsEnd.bottom);

  return {
    getBoundingClientRect: () =>
      new DOMRect(left, top, right - left, bottom - top),
  };
}

/**
 * Sets up scroll and resize handlers to trigger a callback.
 *
 * @param callback - The function to call on scroll or resize events.
 *                   It receives a `refresh_counter` to track updates.
 * @param abortSignal - An `AbortSignal` to stop the handlers.
 */
export function setupScrollAndResizeHandlers(
  callback: (refresh_counter: number) => void,
  abortSignal: AbortSignal,
) {
  let refresh_counter = 0;
  let rafId: number | null = null;

  const handleScrollOrResizeWithRaf = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        refresh_counter++;
        callback(refresh_counter);
        rafId = null;
      });
    }
  };

  if (abortSignal.aborted) {
    return;
  }

  window.addEventListener('scroll', handleScrollOrResizeWithRaf, {
    passive: true,
  });
  window.addEventListener('resize', handleScrollOrResizeWithRaf, {
    passive: true,
  });

  abortSignal.addEventListener('abort', () => {
    window.removeEventListener('scroll', handleScrollOrResizeWithRaf);
    window.removeEventListener('resize', handleScrollOrResizeWithRaf);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  });
}
