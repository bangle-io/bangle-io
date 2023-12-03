/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { Emitter } from '@bangle.io/emitter';
import { waitForExpect } from '@bangle.io/test-utils-common';
import { setupSliceTestStore } from '@bangle.io/test-utils-slice';
import { checkWidescreen, listenToResize } from '@bangle.io/window-utils';

import { sliceUI, sliceUIAllSlices } from '../index';

jest.mock('@bangle.io/window-utils', () => {
  const actualUtils = jest.requireActual('@bangle.io/window-utils');
  return {
    ...actualUtils,
    checkWidescreen: jest.fn(() => true),
    listenToResize: jest.fn(),
  };
});

let createResizeEmitter = () =>
  Emitter.create<{
    event: 'resize';
    payload: { width: number; height: number };
  }>();

let resizeEmitter: ReturnType<typeof createResizeEmitter>;

const checkWidescreenMock = jest.mocked(checkWidescreen);

const listenToResizeMock = jest.mocked(listenToResize);

beforeEach(() => {
  resizeEmitter = Emitter.create<{
    event: 'resize';
    payload: { width: number; height: number };
  }>();

  listenToResizeMock.mockImplementation((onResize, abortSignal) => {
    resizeEmitter.on('resize', (d) => {
      onResize(d);
    });

    abortSignal.addEventListener(
      'abort',
      () => {
        resizeEmitter.destroy();
      },
      {
        once: true,
      },
    );
  });

  checkWidescreenMock.mockImplementation(() => true);
});

afterEach(() => {
  resizeEmitter.destroy();
});

const fireResizeEvent = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  // If necessary, set the new innerWidth value
  resizeEmitter.emit('resize', {
    width,
    height,
  });
};

describe('sliceUI', () => {
  test('works', () => {
    document.documentElement.classList.add('BU_widescreen');

    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });

    expect(sliceUI.get(ctx.store.state).widescreen).toBe(true);
  });

  test('default state is correct', () => {
    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });
    const state = sliceUI.get(ctx.store.state);
    expect(state.widescreen).toBe(true);
    expect(state.screenWidth).toBe(1024);
    expect(state.showActivitybar).toBe(false);
    expect(state.showLeftAside).toBe(true);
    expect(state.showRightAside).toBe(false);
  });

  test('toggleActivitybar works with explicit true and false', () => {
    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });

    let state = ctx.store.state;
    state = state.apply(sliceUI.toggleActivitybar(true));
    expect(sliceUI.get(state).showActivitybar).toBe(true);

    state = state.apply(sliceUI.toggleActivitybar(false));
    expect(sliceUI.get(state).showActivitybar).toBe(false);
  });

  test('toggleActivitybar toggles state when undefined', () => {
    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });
    let state = ctx.store.state;

    state = state.apply(sliceUI.toggleActivitybar(undefined));
    expect(sliceUI.get(state).showActivitybar).toBe(true); // toggled from false to true
  });

  test('resizing works', async () => {
    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });
    expect(await ctx.runEffects()).toBeGreaterThan(0);

    const store = ctx.store;
    expect(sliceUI.get(store.state).showRightAside).toBe(false);

    fireResizeEvent({ width: 800, height: 600 });

    expect(await ctx.runEffects()).toBeGreaterThan(0);

    await waitForExpect(() => {
      expect(sliceUI.get(store.state).screenWidth).toBe(800);
    });
  });

  test('toggling left aside if right is open in tight screen should close right', async () => {
    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });
    expect(await ctx.runEffects()).toBeGreaterThan(0);

    fireResizeEvent({ width: 800, height: 600 });

    expect(await ctx.runEffects()).toBeGreaterThan(0);

    ctx.store.dispatch(sliceUI.toggleRightAside(true));
    expect(sliceUI.get(ctx.store.state).showRightAside).toBe(true);

    ctx.store.dispatch(sliceUI.toggleLeftAside(true));
    expect(sliceUI.get(ctx.store.state).showRightAside).toBe(false);
    expect(sliceUI.get(ctx.store.state).showLeftAside).toBe(true);
  });

  test('toggling left aside if right is open in wide screen should not close right', async () => {
    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });
    expect(await ctx.runEffects()).toBeGreaterThan(0);
    fireResizeEvent({ width: 1920, height: 600 });
    expect(await ctx.runEffects()).toBeGreaterThan(0);

    ctx.store.dispatch(sliceUI.toggleRightAside(true));
    expect(sliceUI.get(ctx.store.state).showRightAside).toBe(true);

    ctx.store.dispatch(sliceUI.toggleLeftAside(true));
    expect(sliceUI.get(ctx.store.state).showRightAside).toBe(true);
    expect(sliceUI.get(ctx.store.state).showLeftAside).toBe(true);
  });

  test('toggling right aside if left is open in wide screen should not close left', async () => {
    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });
    expect(await ctx.runEffects()).toBeGreaterThan(0);
    fireResizeEvent({ width: 1920, height: 600 });
    expect(await ctx.runEffects()).toBeGreaterThan(0);

    ctx.store.dispatch(sliceUI.toggleLeftAside(true));
    expect(sliceUI.get(ctx.store.state).showLeftAside).toBe(true);

    ctx.store.dispatch(sliceUI.toggleRightAside(true));
    expect(sliceUI.get(ctx.store.state).showRightAside).toBe(true);
    expect(sliceUI.get(ctx.store.state).showLeftAside).toBe(true);
  });

  test('toggling right aside if left is open in tight screen should close left', async () => {
    const ctx = setupSliceTestStore({
      slices: sliceUIAllSlices,
    });
    expect(await ctx.runEffects()).toBeGreaterThan(0);
    fireResizeEvent({ width: 800, height: 600 });
    expect(await ctx.runEffects()).toBeGreaterThan(0);

    ctx.store.dispatch(sliceUI.toggleLeftAside(true));
    expect(sliceUI.get(ctx.store.state).showLeftAside).toBe(true);

    ctx.store.dispatch(sliceUI.toggleRightAside(true));
    expect(sliceUI.get(ctx.store.state).showRightAside).toBe(true);
    expect(sliceUI.get(ctx.store.state).showLeftAside).toBe(false);
  });
});
