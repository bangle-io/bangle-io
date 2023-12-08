/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import {
  getToastEmitter,
  queueToast,
  sliceUIAllSlices,
} from '@bangle.io/slice-ui';
import { sleep } from '@bangle.io/test-utils';
import { TestProvider } from '@bangle.io/test-utils-react';
import { setupSliceTestStore } from '@bangle.io/test-utils-slice';

import { ToastArea } from '../ToastArea';

let abortController = new AbortController();

describe('ToastArea', () => {
  beforeEach(() => {
    abortController = new AbortController();
  });

  afterEach(async () => {
    abortController.abort();
    cleanup();

    await sleep();
  });

  const setup = () => {
    const ctx = setupSliceTestStore({
      slices: [...sliceUIAllSlices],
      abortSignal: abortController.signal,
    });

    const onToastReq = jest.fn();

    getToastEmitter(ctx.store).on('toast-request', onToastReq);

    return {
      ...ctx,
      onToastReq,
      render: () => {
        const result = render(
          <TestProvider store={ctx.store}>
            <ToastArea />
          </TestProvider>,
        );

        abortController.signal.addEventListener('abort', () => {
          result.unmount();
        });

        return result;
      },
    };
  };

  test('clears a specific toast', () => {
    const ctx = setup();

    ctx.render();

    act(() => {
      queueToast(ctx.store, {
        label: 'Toast to clear',
        type: 'positive',
        id: 'clear-me',
      });
    });

    expect(screen.getByRole('alert', { name: 'Toast to clear' })).toBeTruthy();

    act(() => {
      getToastEmitter(ctx.store).emit('toast-clear', { id: 'clear-me' });
    });

    expect(screen.queryByRole('alert', { name: 'Toast to clear' })).toBeNull();
  });
});
