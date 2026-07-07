import type { BaseRouter, PageLifeCycleState } from '@bangle.io/types';

/**
 * Whether a page-lifecycle transition means the user has come back to the
 * page after being away:
 *
 * - the tab became visible again (`hidden`/`frozen` → `passive`/`active`), or
 * - the window regained focus while already visible (`passive` → `active`) —
 *   e.g. the user was editing files in another app window next to the
 *   browser and clicked back.
 *
 * The initial page load (`undefined` → `active`) is intentionally NOT a
 * return: everything is freshly read at that point.
 *
 * States come from the router's page-lifecycle stream, which normalizes the
 * Page Visibility API (`visibilitychange`, window focus/blur, and the Page
 * Lifecycle freeze/resume events) via GoogleChromeLabs' page-lifecycle.
 */
export function isPageReturnTransition(
  current: PageLifeCycleState,
  previous: PageLifeCycleState,
): boolean {
  if (current !== 'active' && current !== 'passive') {
    return false;
  }
  if (previous === 'hidden' || previous === 'frozen') {
    return true;
  }
  return current === 'active' && previous === 'passive';
}

/**
 * Invokes `listener` whenever the user returns to the page, derived from the
 * router-owned page-lifecycle event stream. Consumers use this to revalidate
 * state that may have gone stale while the page was hidden, unfocused, or
 * frozen (e.g. files changed on disk by a sync tool).
 *
 * The listener can fire in quick succession around a single return (the
 * browser may emit `hidden → passive → active` as separate transitions);
 * callers that do non-trivial work must throttle.
 */
export function onPageReturn(
  emitter: Pick<BaseRouter['emitter'], 'on'>,
  listener: () => void,
  signal: AbortSignal,
): void {
  emitter.on(
    'event::router:page-lifecycle-state',
    ({ current, previous }) => {
      if (isPageReturnTransition(current, previous)) {
        listener();
      }
    },
    signal,
  );
}
