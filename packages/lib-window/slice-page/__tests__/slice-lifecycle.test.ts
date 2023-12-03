/**
 * @jest-environment @bangle.io/jsdom-env
 */
import lifeCycle from 'page-lifecycle';

import { setupSliceTestStore } from '@bangle.io/test-utils-slice';

import { blockPageField, sliceLifeCycle } from '../slice-lifecycle';

jest.mock('page-lifecycle', () => {
  return {
    state: 'active' as const,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    removeUnsavedChanges: jest.fn(),
    addUnsavedChanges: jest.fn(),
  };
});

let lifeCycleMock = lifeCycle;

beforeEach(() => {
  (lifeCycleMock.addEventListener as any).mockImplementation(() => {});
  (lifeCycleMock.removeEventListener as any).mockImplementation(() => {});
  (lifeCycleMock.removeUnsavedChanges as any).mockImplementation(() => {});
  (lifeCycleMock.addUnsavedChanges as any).mockImplementation(() => {});
});

describe('sliceLifecycle', () => {
  test('sets up correctly', async () => {
    const ctx = setupSliceTestStore({
      slices: [sliceLifeCycle],
    });

    await ctx.runEffects();

    const { store } = ctx;

    expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(0);
    expect(sliceLifeCycle.get(ctx.store.state)).toEqual({
      pageLifeCycle: 'active',
    });

    expect(blockPageField.get(ctx.store.state)).toEqual(false);
  });

  describe('blocks pagereload', () => {
    let ctx: ReturnType<typeof setupSliceTestStore>;

    beforeEach(async () => {
      ctx = setupSliceTestStore({
        slices: [sliceLifeCycle],
      });
    });

    test('blocking works', async () => {
      await ctx.runEffects();
      const { store } = ctx;

      store.dispatch(sliceLifeCycle.actions.blockPageReload());

      expect(blockPageField.get(ctx.store.state)).toEqual(true);

      await ctx.runEffects();

      expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);
      expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);

      store.dispatch(sliceLifeCycle.actions.unblockPageReload());

      expect(blockPageField.get(ctx.store.state)).toEqual(false);

      await ctx.runEffects();

      expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(2);
      expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    });

    test('repeat blocking is no-op', async () => {
      await ctx.runEffects();
      const { store } = ctx;

      store.dispatch(sliceLifeCycle.actions.blockPageReload());

      expect(blockPageField.get(ctx.store.state)).toEqual(true);

      await ctx.runEffects();

      expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);
      expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);

      store.dispatch(sliceLifeCycle.actions.blockPageReload());
      expect(blockPageField.get(ctx.store.state)).toEqual(true);

      await ctx.runEffects();

      expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);
      expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    });

    test('unblocking works', async () => {
      await ctx.runEffects();
      const { store } = ctx;

      store.dispatch(sliceLifeCycle.actions.blockPageReload());
      expect(blockPageField.get(ctx.store.state)).toEqual(true);

      await ctx.runEffects();

      expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(1);
      expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);

      store.dispatch(sliceLifeCycle.actions.unblockPageReload());
      expect(blockPageField.get(ctx.store.state)).toEqual(false);

      await ctx.runEffects();

      expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(2);
      expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(1);
    });

    test('blocking after unblocking works', async () => {
      await ctx.runEffects();
      const { store } = ctx;

      store.dispatch(sliceLifeCycle.actions.blockPageReload());
      expect(blockPageField.get(ctx.store.state)).toEqual(true);

      await ctx.runEffects();

      store.dispatch(sliceLifeCycle.actions.unblockPageReload());
      expect(blockPageField.get(ctx.store.state)).toEqual(false);

      await ctx.runEffects();

      store.dispatch(sliceLifeCycle.actions.blockPageReload());
      expect(blockPageField.get(ctx.store.state)).toEqual(true);
      await ctx.runEffects();

      expect(lifeCycleMock.removeUnsavedChanges).toBeCalledTimes(2);
      expect(lifeCycleMock.addUnsavedChanges).toBeCalledTimes(2);
    });
  });
});
