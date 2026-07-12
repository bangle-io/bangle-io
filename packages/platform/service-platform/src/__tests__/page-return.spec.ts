import { Emitter } from '@bangle.io/mini-js-utils';
import type { BaseRouter, PageLifeCycleState } from '@bangle.io/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isPageReturnTransition,
  onPageReturn,
  type PageReturnInfo,
} from '../router/page-return';

describe('isPageReturnTransition', () => {
  it.each<[PageLifeCycleState, PageLifeCycleState, boolean]>([
    // Coming back from a hidden/frozen tab.
    ['hidden', 'active', true],
    ['hidden', 'passive', true],
    ['frozen', 'active', true],
    ['frozen', 'passive', true],
    // Window regains focus while already visible.
    ['passive', 'active', true],
    // Initial page load is not a return — content is freshly read.
    [undefined, 'active', false],
    [undefined, 'passive', false],
    // Going away is not a return.
    ['active', 'passive', false],
    ['active', 'hidden', false],
    ['passive', 'hidden', false],
    ['active', 'frozen', false],
    ['hidden', 'terminated', false],
  ])('previous=%s current=%s -> %s', (previous, current, expected) => {
    expect(isPageReturnTransition(current, previous)).toBe(expected);
  });
});

describe('onPageReturn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const emitter: BaseRouter['emitter'] = new Emitter();
    const controller = new AbortController();
    const fired: PageReturnInfo[] = [];
    onPageReturn(emitter, (info) => fired.push(info), controller.signal);
    const emit = (
      previous: PageLifeCycleState,
      current: PageLifeCycleState,
    ) => {
      emitter.emit('event::router:page-lifecycle-state', {
        current,
        previous,
      });
    };
    return { emit, fired, controller };
  }

  it('fires only for return transitions, reporting where the user came from', () => {
    const { emit, fired, controller } = setup();

    emit(undefined, 'active'); // initial load
    expect(fired).toEqual([]);
    emit('active', 'hidden'); // user leaves
    expect(fired).toEqual([]);
    emit('hidden', 'passive'); // tab visible again
    expect(fired).toEqual([{ returnedFromHidden: true }]);

    vi.advanceTimersByTime(2_000);
    emit('passive', 'active'); // window focused later, page stayed visible
    expect(fired).toEqual([
      { returnedFromHidden: true },
      { returnedFromHidden: false },
    ]);

    controller.abort();
    vi.advanceTimersByTime(2_000);
    emit('active', 'hidden');
    emit('hidden', 'active');
    expect(fired).toHaveLength(2);
  });

  it('collapses one return burst (hidden → passive → active) into one call', () => {
    const { emit, fired } = setup();

    emit('active', 'hidden');
    emit('hidden', 'passive');
    emit('passive', 'active'); // same return, milliseconds later
    expect(fired).toEqual([{ returnedFromHidden: true }]);

    // A genuinely separate leave→return cycle moments later must fire —
    // consumers without an observer rely on returns as their only
    // reconciliation, so this must be a burst dedupe, not a throttle.
    vi.advanceTimersByTime(1_500);
    emit('active', 'hidden');
    emit('hidden', 'active');
    expect(fired).toEqual([
      { returnedFromHidden: true },
      { returnedFromHidden: true },
    ]);
  });
});
