/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { setupSliceTestStore } from '@bangle.io/test-utils-slice';

import {
  clearAllToast,
  clearToast,
  getToastEmitter,
  queueToast,
  sliceUIToast,
} from '../slice-ui-toast';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(() => {
  abortController.abort();
});

describe('sliceUIToast', () => {
  test('init', () => {
    const ctx = setupSliceTestStore({
      abortSignal: abortController.signal,
      slices: [sliceUIToast],
    });

    const onReq = jest.fn();
    getToastEmitter(ctx.store).on('toast-request', onReq);

    queueToast(ctx.store, {
      label: 'hello',
      type: 'info',
    });

    expect(onReq).toHaveBeenCalledTimes(1);
  });

  test('queue multiple toasts', () => {
    const ctx = setupSliceTestStore({
      abortSignal: abortController.signal,
      slices: [sliceUIToast],
    });

    const onReq = jest.fn();
    getToastEmitter(ctx.store).on('toast-request', onReq);

    queueToast(ctx.store, {
      label: 'toast 1',
      type: 'info',
    });

    queueToast(ctx.store, {
      label: 'toast 2',
      type: 'positive',
    });

    expect(onReq).toHaveBeenCalledTimes(2);
    expect(onReq).toHaveBeenCalledWith({ label: 'toast 1', type: 'info' });
    expect(onReq).toHaveBeenCalledWith({ label: 'toast 2', type: 'positive' });
  });

  test('queue toast with duration', () => {
    const ctx = setupSliceTestStore({
      abortSignal: abortController.signal,
      slices: [sliceUIToast],
    });

    const onReq = jest.fn();
    getToastEmitter(ctx.store).on('toast-request', onReq);

    queueToast(ctx.store, {
      label: 'toast with duration',
      type: 'info',
      timeout: 5000,
    });

    expect(onReq).toHaveBeenCalledTimes(1);
    expect(onReq).toHaveBeenCalledWith({
      label: 'toast with duration',
      type: 'info',
      timeout: 5000,
    });
  });

  test('clear specific toast', () => {
    const ctx = setupSliceTestStore({
      abortSignal: abortController.signal,
      slices: [sliceUIToast],
    });

    const onClear = jest.fn();
    getToastEmitter(ctx.store).on('toast-clear', onClear);

    clearToast(ctx.store, {
      id: 'toast-1',
    });

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledWith({ id: 'toast-1' });
  });

  test('clear all toasts', () => {
    const ctx = setupSliceTestStore({
      abortSignal: abortController.signal,
      slices: [sliceUIToast],
    });

    const onClearAll = jest.fn();
    getToastEmitter(ctx.store).on('toast-clear-all', onClearAll);

    clearAllToast(ctx.store);

    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(onClearAll).toHaveBeenCalledWith({ clear: 'all' });
  });

  test('store destroyed', async () => {
    const ctx = setupSliceTestStore({
      abortSignal: abortController.signal,
      slices: [sliceUIToast],
    });
    const onClearAll = jest.fn();
    await ctx.runEffects();

    getToastEmitter(ctx.store).on('toast-clear-all', onClearAll);
    ctx.store.destroy();

    clearAllToast(ctx.store);
    expect(onClearAll).toHaveBeenCalledTimes(0);
  });
});
