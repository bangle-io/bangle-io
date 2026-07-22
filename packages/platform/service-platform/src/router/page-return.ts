import type { BaseRouter, PageLifeCycleState } from '@bangle.io/types';

/**
 * What a page-return listener learns about the return it is being told
 * about. `returnedFromHidden` distinguishes "the tab was hidden or frozen
 * and is visible again" (the browser may have starved observers and events
 * while away) from a mere window refocus while the page stayed visible the
 * whole time.
 */
export interface PageReturnInfo {
  returnedFromHidden: boolean;
}

/**
 * Window within which page-return transitions are treated as one return: a
 * single return fires `visibilitychange` and `focus` back-to-back (e.g.
 * hidden → passive → active), and only the first should notify. Kept short
 * deliberately — consumers like the native FS revalidation may use the
 * return as their only reconciliation signal, so a genuinely separate
 * leave→edit→return cycle moments later must not be swallowed by a
 * wall-clock throttle.
 */
const PAGE_RETURN_DEDUPE_MS = 1_000;

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
 * The browser reports a single return as several transitions (hidden →
 * passive → active); this helper collapses them so the listener fires once
 * per return, with `returnedFromHidden` taken from the transition that won
 * the collapse.
 */
export function onPageReturn(
  emitter: Pick<BaseRouter['emitter'], 'on'>,
  listener: (info: PageReturnInfo) => void,
  signal: AbortSignal,
): void {
  let lastNotified = 0;
  emitter.on(
    'event::router:page-lifecycle-state',
    ({ current, previous }) => {
      if (!isPageReturnTransition(current, previous)) {
        // A real departure starts a new return cycle immediately. Keep the
        // clock only for adjacent transitions within one browser-generated
        // hidden → passive → active burst.
        lastNotified = 0;
        return;
      }
      const now = Date.now();
      if (now - lastNotified < PAGE_RETURN_DEDUPE_MS) {
        return;
      }
      lastNotified = now;
      listener({
        returnedFromHidden: previous === 'hidden' || previous === 'frozen',
      });
    },
    signal,
  );
}
