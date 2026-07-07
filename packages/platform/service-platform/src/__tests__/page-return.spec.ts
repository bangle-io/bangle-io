import { Emitter } from '@bangle.io/mini-js-utils';
import type { BaseRouter, PageLifeCycleState } from '@bangle.io/types';
import { describe, expect, it } from 'vitest';
import { isPageReturnTransition, onPageReturn } from '../router/page-return';

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
  it('fires only for return transitions and stops on abort', () => {
    const emitter: BaseRouter['emitter'] = new Emitter();
    const controller = new AbortController();
    let fired = 0;

    onPageReturn(emitter, () => (fired += 1), controller.signal);

    const emit = (
      previous: PageLifeCycleState,
      current: PageLifeCycleState,
    ) => {
      emitter.emit('event::router:page-lifecycle-state', {
        current,
        previous,
      });
    };

    emit(undefined, 'active'); // initial load
    expect(fired).toBe(0);
    emit('active', 'hidden'); // user leaves
    expect(fired).toBe(0);
    emit('hidden', 'passive'); // tab visible again
    expect(fired).toBe(1);
    emit('passive', 'active'); // window focused
    expect(fired).toBe(2);

    controller.abort();
    emit('active', 'hidden');
    emit('hidden', 'active');
    expect(fired).toBe(2);
  });
});
