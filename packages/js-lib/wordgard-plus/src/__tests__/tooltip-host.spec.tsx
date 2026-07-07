// @vitest-environment happy-dom

import { basicSchema, Tooltip, Wordgard } from '@bangle.io/wordgard-utils';
import { act, render } from '@testing-library/react';
import { createStore } from 'jotai';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { createTooltipHost, reactTooltip, TooltipHost } from '../tooltip-host';

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

function nextFlush(): Promise<void> {
  return act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
}

describe('reactTooltip + TooltipHost', () => {
  test('portals React content into a connected tooltip view and releases it on disconnect', () => {
    const store = createStore();
    const host = createTooltipHost(store);
    const { container } = render(<TooltipHost handle={host} />);
    cleanups.push(() => {
      // render() cleanup happens via testing-library auto-cleanup; nothing
      // editor-side to release in this pure lifecycle test.
    });

    const tooltip = reactTooltip({
      host,
      pos: 1,
      className: 'my-tooltip',
      content: () => <span data-testid="tip">TIP</span>,
    });

    // Drive the Tooltip.View lifecycle directly, as the editor would.
    const view = tooltip.create(
      // The content callback receives the editor; this lifecycle test never
      // dereferences it.
      undefined as unknown as Wordgard,
    );
    expect(view.dom.className).toBe('my-tooltip');

    act(() => {
      view.connect?.(undefined as unknown as Wordgard);
    });
    expect(view.dom.textContent).toBe('TIP');
    // The portal renders through the host component's React tree.
    expect(container).toBeDefined();

    act(() => {
      view.disconnect?.(undefined as unknown as Wordgard);
    });
    expect(view.dom.textContent).toBe('');
  });

  test('a tooltip provided via the Tooltip.show facet renders inside a real editor', async () => {
    const store = createStore();
    const host = createTooltipHost(store);
    render(<TooltipHost handle={host} />);

    const parent = document.createElement('div');
    document.body.append(parent);
    const wg = Wordgard.create({
      parent,
      doc: '<p>hello</p>',
      config: [
        basicSchema(),
        Tooltip.show.of(
          reactTooltip({
            host,
            pos: 1,
            content: () => <strong>from-react</strong>,
          }),
        ),
      ],
    });
    cleanups.push(() => {
      wg.dom.remove();
      parent.remove();
    });

    await nextFlush();

    expect(wg.dom.textContent).toContain('from-react');
  });

  test('multiple tooltips keep independent content', () => {
    const store = createStore();
    const host = createTooltipHost(store);
    render(<TooltipHost handle={host} />);

    const first = reactTooltip({
      host,
      pos: 1,
      content: () => <span>one</span>,
    }).create(undefined as unknown as Wordgard);
    const second = reactTooltip({
      host,
      pos: 2,
      content: () => <span>two</span>,
    }).create(undefined as unknown as Wordgard);

    act(() => {
      first.connect?.(undefined as unknown as Wordgard);
      second.connect?.(undefined as unknown as Wordgard);
    });
    expect(first.dom.textContent).toBe('one');
    expect(second.dom.textContent).toBe('two');

    act(() => {
      first.disconnect?.(undefined as unknown as Wordgard);
    });
    expect(first.dom.textContent).toBe('');
    expect(second.dom.textContent).toBe('two');
  });
});
