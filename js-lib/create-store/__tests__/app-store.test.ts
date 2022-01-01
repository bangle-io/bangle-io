import { AppState } from '../app-state';
import { Slice, SliceSideEffect } from '../app-state-slice';
import {
  ApplicationStore,
  DeferredSideEffectsRunner,
  SchedulerType,
} from '../app-store';
import { SliceKey } from '../slice-key';

function sleep(t = 20): Promise<void> {
  return new Promise((res) => setTimeout(res, t));
}

describe('store', () => {
  test('empty store', () => {
    const state = AppState.create({ slices: [] });
    const store = ApplicationStore.create({ storeName: 'test-store', state });
    expect(store).toMatchSnapshot();
  });

  test('adds id to action', () => {
    let dispatchedAction: any[] = [];
    const state = AppState.create({ slices: [] });
    const store = ApplicationStore.create({
      storeName: 'test-store',
      state,
      dispatchAction: (store, action) => {
        dispatchedAction.push(action);
      },
    });

    store.dispatch({
      name: 'for-x',
    });

    expect(dispatchedAction).toHaveLength(1);
    expect(dispatchedAction[0].id).toEqual(expect.any(String));
    expect(dispatchedAction[0].id.startsWith('test-store-')).toBe(true);
    expect(dispatchedAction[0].id.split('test-store-')[1]).toMatch(/^\d+$/);

    store.dispatch({
      name: 'for-y',
    });

    expect(dispatchedAction[1].id.split('test-store-')[1]).toMatch(/^\d+$/);

    // each id is unique
    expect(dispatchedAction[0].id).not.toEqual(dispatchedAction[1].id);
  });

  test('throws error when deferredUpdate is used without scheduler', () => {
    const state = AppState.create({
      slices: [
        new Slice({ sideEffect: () => ({ deferredUpdate: () => ({}) }) }),
      ],
    });

    expect(() =>
      ApplicationStore.create({ storeName: 'test-store', state }),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Scheduler needs to be defined for using Slice's deferredUpdate"`,
    );
  });

  describe('basic tests', () => {
    const key1 = new SliceKey<number, ActionType>('one');
    const key2 = new SliceKey<number, ActionType>('two');
    let state: AppState<any, any>, store: ApplicationStore<any>;
    type ActionType =
      | {
          name: 'for-a';
          value: number;
        }
      | {
          name: 'for-b';
          value: number;
        };

    beforeEach(() => {
      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => 1,
          apply: (action, value, appState) => {
            if (action.name === 'for-a') {
              return action.value;
            }
            return value;
          },
        },
      });

      const slice2 = new Slice({
        key: key2,
        state: {
          init: () => 2,
          apply: (action, value, appState) => {
            if (action.name === 'for-b') {
              return action.value;
            }
            return value;
          },
        },
      });

      state = AppState.create({ slices: [slice1, slice2] });
      store = ApplicationStore.create({ storeName: 'test-store', state });
    });

    test('sets up properly', () => {
      expect(store).toMatchSnapshot();
    });

    test('updates', () => {
      store.dispatch({ name: 'for-a', value: 77 });
      expect(key1.getSliceState(store.state)).toBe(77);
      expect(key2.getSliceState(store.state)).toBe(2);
    });

    test('updates 1', () => {
      store.dispatch({ name: 'for-a', value: 99 });
      store.dispatch({ name: 'for-b', value: 88 });
      expect(key1.getSliceState(store.state)).toBe(99);
      expect(key2.getSliceState(store.state)).toBe(88);
    });

    test('dispatch is binded', () => {
      const dispatch = store.dispatch;
      dispatch({ name: 'for-a', value: 99 });
      expect(key1.getSliceState(store.state)).toBe(99);
    });

    test('destroys', () => {
      store.destroy();
      expect((store as any).destroyed).toBe(true);
      expect(store).toMatchSnapshot();

      let newState = AppState.create({ slices: [] });
      store.updateState(newState);
      expect(store).not.toBe(newState);
    });

    test('after destroying prevent updates', () => {
      store.dispatch({ name: 'for-a', value: 99 });
      expect(key1.getSliceState(store.state)).toBe(99);
      store.destroy();
      store.dispatch({ name: 'for-a', value: 100 });
      expect(key1.getSliceState(store.state)).toBe(99);

      store.dispatch({ name: 'for-b', value: 88 });
      expect(key2.getSliceState(store.state)).toBe(2);
    });
  });

  describe('side effects', () => {
    const key1 = new SliceKey<number>('one');
    const key2 = new SliceKey<number>('two');

    const setup = (effects1) => {
      let state: AppState<any, any>, store: ApplicationStore<any>;

      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => 1,
          apply: (action, value, appState) => {
            if (action.name === 'for-a') {
              return action.value;
            }
            return value;
          },
        },
        sideEffect: effects1,
      });

      const slice2 = new Slice({
        key: key2,
        state: {
          init: () => 2,
          apply: (action, value, appState) => {
            if (action.name === 'for-b') {
              return action.value;
            }
            return value;
          },
        },
      });

      state = AppState.create({ slices: [slice1, slice2] });
      store = ApplicationStore.create({ storeName: 'test-store', state });

      return store;
    };

    test('sets up side effect correctly', () => {
      const update = jest.fn(() => {});
      const destroy = jest.fn(() => {});
      const sideEffect = jest.fn(() => ({
        update,
        destroy,
      }));

      let store = setup(sideEffect);

      expect(sideEffect).toBeCalledTimes(1);
      expect(sideEffect).nthCalledWith(1, store);
      expect(destroy).toBeCalledTimes(0);
      expect(update).toBeCalledTimes(0);
      let originalState = store.state;
      store.dispatch({ name: 'for-a', value: 100 });

      expect(update).toBeCalledTimes(1);

      expect(update).nthCalledWith(1, store, originalState, 100, 1);
      expect(key1.getSliceState(originalState)).toBe(1);
      expect(key1.getSliceState(store.state)).toBe(100);

      store.destroy();
      expect(destroy).toBeCalledTimes(1);
    });

    test('calls side effect at the end of all updates', () => {
      const key2 = new SliceKey<number>('two');
      const key1 = new SliceKey<number>('one');

      let sideEffect2Value;
      let sideEffect2Update = jest.fn((store, prevState) => {
        sideEffect2Value = {
          prevValue: {
            key1: key1.getSliceState(prevState),
            key2: key2.getSliceState(prevState),
          },
          curValue: {
            key1: key1.getSliceState(store.state),
            key2: key2.getSliceState(store.state),
          },
        };
      });
      let sideEffect1Update = jest.fn();
      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => 1,
          apply: (action, value, appState) => {
            if (action.name === 'for-a') {
              return action.value;
            }
            return value;
          },
        },
        sideEffect() {
          return {
            update: sideEffect1Update,
          };
        },
      });

      const slice2 = new Slice({
        key: key2,
        state: {
          init: () => 2,
        },
        sideEffect() {
          return {
            update: sideEffect2Update,
          };
        },
      });

      let store = ApplicationStore.create({
        storeName: 'test-store',
        state: AppState.create({ slices: [slice1, slice2] }),
      });

      let prevState = store.state;

      store.dispatch({ name: 'for-a', value: 100 });

      expect(sideEffect2Update).toBeCalledTimes(1);
      expect(sideEffect2Update).nthCalledWith(1, store, prevState, 2, 2);

      expect(sideEffect1Update).toBeCalledTimes(1);
      expect(sideEffect1Update).nthCalledWith(1, store, prevState, 100, 1);

      expect(sideEffect2Value).toMatchInlineSnapshot(`
        Object {
          "curValue": Object {
            "key1": 100,
            "key2": 2,
          },
          "prevValue": Object {
            "key1": 1,
            "key2": 2,
          },
        }
      `);
    });

    test('replacing with a different state causes side effects to reset', () => {
      const update1 = jest.fn(() => {});
      const destroy1 = jest.fn(() => {});
      const sideEffect1 = jest.fn(() => ({
        update: update1,
        destroy: destroy1,
      }));
      let store = setup(sideEffect1);

      store.dispatch({ name: 'for-a', value: 100 });
      expect(sideEffect1).toBeCalledTimes(1);

      expect(sideEffect1).toBeCalledTimes(1);
      expect(update1).toBeCalledTimes(1);
      expect(destroy1).toBeCalledTimes(0);

      const update2 = jest.fn(() => {});
      const destroy2 = jest.fn(() => {});
      const sideEffect2 = jest.fn(() => {
        return { update: update2, destroy: destroy2 };
      });

      let differentState = AppState.create({
        slices: [
          new Slice({
            sideEffect: sideEffect2,
          }),
        ],
      });

      store.updateState(differentState);

      expect(destroy1).toBeCalledTimes(1);
      expect(sideEffect1).toBeCalledTimes(1);
      expect(update1).toBeCalledTimes(1);

      expect(sideEffect2).toBeCalledTimes(1);
      expect(sideEffect2).nthCalledWith(1, store);
      expect(destroy2).toBeCalledTimes(0);
      expect(update2).toBeCalledTimes(1);
      expect(update2).nthCalledWith(
        1,
        store,
        differentState,
        undefined,
        undefined,
      );
    });
  });

  describe('multiple side effects in a single slice', () => {
    const key1 = new SliceKey<number>('one');
    const key2 = new SliceKey<number>('two');

    const sideEffect1 = jest.fn();
    const update1 = jest.fn();
    const update2 = jest.fn();
    const destroy1 = jest.fn();
    const destroy2 = jest.fn();
    test('works correctly', () => {
      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => 1,
          apply: (action, value, appState) => {
            if (action.name === 'for-a') {
              return action.value;
            }
            return value;
          },
        },
        sideEffect: sideEffect1,
      });

      const slice2 = new Slice({
        key: key2,
        state: {
          init: () => 2,
          apply: (action, value, appState) => {
            if (action.name === 'for-b') {
              return action.value;
            }
            return value;
          },
        },
        sideEffect: [
          () => {
            return {
              update: update1,
              destroy: destroy1,
            };
          },
          () => {
            return {
              update: update2,
              destroy: destroy2,
            };
          },
        ],
      });

      let originalState = AppState.create({ slices: [slice1, slice2] });
      let store = ApplicationStore.create({
        storeName: 'test-store',
        state: originalState,
      });

      store.dispatch({
        name: 'for-b',
        value: 77,
      });
      expect(update1).nthCalledWith(1, store, originalState, 77, 2);
      expect(update2).nthCalledWith(1, store, originalState, 77, 2);

      store.destroy();
      expect(destroy2).toBeCalledTimes(1);
      expect(destroy1).toBeCalledTimes(1);
    });
  });

  describe('previous state', () => {
    test('works well', async () => {
      const key1 = new SliceKey<string>('one');
      const key2 = new SliceKey<number>('two');

      const firstEffect = jest.fn(
        (store, prevState, sliceState, prevSliceState) => {
          if (sliceState === 'value-a') {
            store.dispatch({
              name: 'for-a',
              value: 'value-b',
            });
          }
        },
      );

      const secondEffect = jest.fn(
        (store, prevState, sliceState, prevSliceState) => {},
      );
      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => '',
          apply: (action, value, appState) => {
            if (action.name === 'for-a') {
              return action.value;
            }
            return value;
          },
        },
        sideEffect() {
          return {
            update: firstEffect,
          };
        },
      });

      const slice2 = new Slice({
        key: key2,
        state: {
          init: () => 0,
          apply: (action, value, appState) => {
            if (action.name === 'for-b') {
              return action.value;
            }
            return value;
          },
        },
        sideEffect() {
          return {
            update: secondEffect,
          };
        },
      });

      let originalState = AppState.create({ slices: [slice1, slice2] });

      let store = ApplicationStore.create({
        storeName: 'test-store',
        state: originalState,
      });

      // Dispatch a normal action where both effects
      // should update
      store.dispatch({
        name: 'for-a',
        value: 'value-prep',
      });

      const state1 = store.state;

      expect(key1.getSliceState(store.state)).toBe('value-prep');
      expect(firstEffect).toBeCalledTimes(1);
      expect(secondEffect).toBeCalledTimes(1);
      expect(secondEffect).nthCalledWith(
        1,
        store,
        originalState,
        key2.getSliceState(store.state),
        key2.getSliceState(originalState),
      );

      store.dispatch({
        name: 'for-a',
        value: 'value-a',
      });

      expect(key1.getSliceState(store.state)).toBe('value-b');
      // called one extra because the first effect dispatches an action
      // essentially early exiting the update for all of the remaining effects
      expect(firstEffect).toBeCalledTimes(3);
      expect(secondEffect).toBeCalledTimes(2);
      expect(secondEffect).nthCalledWith(
        2,
        store,
        state1,
        key2.getSliceState(store.state),
        key2.getSliceState(state1),
      );
    });
  });

  describe('deferred side effects', () => {
    test('does not call deferred update when scheduler is not provided', () => {
      const deferredUpdate = jest.fn(() => {});
      const sideEffect = jest.fn(() => ({
        deferredUpdate,
      }));
      const state = AppState.create({
        slices: [
          new Slice({
            sideEffect,
          }),
        ],
      });
      const store = ApplicationStore.create({
        storeName: 'test-store',
        state,
        scheduler: () => {
          return () => {};
        },
      });
      expect(store).toMatchSnapshot();
      expect(sideEffect).toBeCalledTimes(1);
      store.dispatch({
        name: 'hello',
      });
      expect(deferredUpdate).toBeCalledTimes(0);
    });

    describe('deferred for single slice', () => {
      const setup = (
        scheduler: SchedulerType,
        deferredUpdate: ReturnType<
          SliceSideEffect<any, any, any>
        >['deferredUpdate'],
      ) => {
        const sideEffect = jest.fn(() => ({
          deferredUpdate,
        }));
        const counterKey = new SliceKey<number>('counterKey');
        const state = AppState.create({
          slices: [
            new Slice({
              key: counterKey,
              state: {
                init: () => 0,
                apply: (_, val) => {
                  return val + 1;
                },
              },
            }),
            new Slice({
              sideEffect,
            }),
          ],
        });

        const store = ApplicationStore.create({
          storeName: 'test-store',
          state: state,
          scheduler,
        });
        return {
          counterKey,
          store,
          deferredUpdate,
          sideEffect,
        };
      };

      test('abort scheduled callback correctly', async () => {
        let cancelScheduler = jest.fn(() => {});

        const scheduler = jest.fn((cb) => {
          return cancelScheduler;
        });

        const deferredUpdate = jest.fn(() => {});

        const { store } = setup(scheduler, deferredUpdate);

        store.dispatch({
          name: 'hello',
        });

        // since there is no prior scheduled action
        // nothing to cancel
        expect(cancelScheduler).toBeCalledTimes(0);

        for (let i = 0; i < 5; i++) {
          store.dispatch({
            name: 'hello',
          });
        }

        expect(cancelScheduler).toBeCalledTimes(5);
        // no deferred update calls since we the provided scheduler
        // never runs a deferred task
        expect(deferredUpdate).toBeCalledTimes(0);
      });

      test('abort deferred tasks correctly', async () => {
        let cancelScheduler = jest.fn(() => {});
        const scheduler = jest.fn((cb) => {
          cb();
          return cancelScheduler;
        });

        let signals: AbortSignal[] = [];

        const { store } = setup(scheduler, (store, signal) => {
          signals.push(signal);
        });

        store.dispatch({
          name: 'hello',
        });

        // wait for the scheduler async-ness to finish
        await sleep(10);

        expect(signals).toHaveLength(1);
        expect(signals[0]?.aborted).toBe(false);

        store.dispatch({
          name: 'hello2',
        });
        store.dispatch({
          name: 'hello3',
        });
        await sleep(10);
        expect(signals).toHaveLength(2);
        expect(signals[1]?.aborted).toBe(false);
      });

      test('calls deferred update correctly', async () => {
        let cancelScheduler;
        let task;
        const scheduler = jest.fn((cb) => {
          task = cb;
          cancelScheduler = jest.fn(() => {
            task = undefined;
          });
          return cancelScheduler;
        });

        const deferredUpdate = jest.fn(() => {});

        const { store, counterKey, sideEffect } = setup(
          scheduler,
          deferredUpdate,
        );

        expect(sideEffect).toBeCalledTimes(1);
        expect(scheduler).toBeCalledTimes(0);
        store.dispatch({
          name: 'hello',
        });

        expect(scheduler).toBeCalledTimes(1);

        store.dispatch({
          name: 'hello',
        });

        expect(counterKey.getSliceState(store.state)).toBe(2);
        expect(deferredUpdate).toBeCalledTimes(0);
        expect(cancelScheduler).toBeCalledTimes(0);

        expect(task).toBeTruthy();
        task();

        await sleep(10);

        expect(deferredUpdate).toBeCalledTimes(1);
        expect(deferredUpdate).nthCalledWith(1, store, expect.any(AbortSignal));
        expect((deferredUpdate as any).mock.calls[0][1]?.aborted).toBe(false);
      });
    });

    describe('deferred scenarios', () => {
      test('deferred side-effect dispatching should abort next in batch side-effects', async () => {
        const counterKey = new SliceKey<number>('counterKey');
        let deferredCounters = {
          first: 0,
          second: 0,
          third: 0,
        };

        let syncCounters = {
          first: 0,
          second: 0,
          third: 0,
        };

        const state = AppState.create({
          slices: [
            new Slice({
              sideEffect: () => {
                return {
                  update: () => {
                    syncCounters.first++;
                  },
                  deferredUpdate: (store) => {
                    if (deferredCounters.first === 0) {
                      // dispatch an action on first run
                      store.dispatch({});
                    }
                    deferredCounters.first++;
                  },
                };
              },
            }),
            new Slice({
              key: counterKey,
              state: {
                init: () => 0,
                apply: (_, val) => {
                  return val + 1;
                },
              },
              sideEffect: () => {
                return {
                  update: () => {
                    syncCounters.second++;
                  },
                  deferredUpdate: (store) => {
                    deferredCounters.second++;
                  },
                };
              },
            }),
            new Slice({
              sideEffect: () => {
                return {
                  update: () => {
                    syncCounters.third++;
                  },
                  deferredUpdate: (store) => {
                    deferredCounters.third++;
                  },
                };
              },
            }),
          ],
        });

        const store = ApplicationStore.create({
          storeName: 'test-store',
          state,
          scheduler: (cb) => {
            let destroyed = false;
            Promise.resolve().then(() => {
              if (!destroyed) {
                cb();
              }
            });
            return () => {
              destroyed = true;
            };
          },
        });
        store.dispatch({ name: 'something' });

        await sleep(10);
        expect(deferredCounters).toEqual({
          // first slice dispatching should
          // prevent the first of side effects for subsequent
          // slices.
          first: 2,
          second: 1,
          third: 1,
        });
        expect(syncCounters).toEqual({
          first: 2,
          second: 2,
          third: 2,
        });
      });
    });

    test('destroying works', async () => {
      const destroy1 = jest.fn();
      const destroy2 = jest.fn();

      const state = AppState.create({
        slices: [
          new Slice({
            sideEffect: () => {
              return {
                update: () => {},
                deferredUpdate: (store) => {},
                destroy: destroy1,
              };
            },
          }),
          new Slice({
            sideEffect: () => {
              return {
                destroy: destroy2,
                update: () => {},
                deferredUpdate: (store) => {},
              };
            },
          }),
        ],
      });

      const store = ApplicationStore.create({
        storeName: 'test-store',
        state,
        scheduler: (cb) => {
          let destroyed = false;
          Promise.resolve().then(() => {
            if (!destroyed) {
              cb();
            }
          });
          return () => {
            destroyed = true;
          };
        },
      });

      store.dispatch({ name: 'something' });
      store.destroy();

      expect(destroy1).toBeCalledTimes(1);
      expect(destroy2).toBeCalledTimes(1);
    });
  });
});

describe('DeferredSideEffectsRunner', () => {
  test('calling run again throws error', () => {
    const runner = new DeferredSideEffectsRunner([], () => () => ({}));
    runner.run({} as any);
    expect(() => runner.run({} as any)).toThrowErrorMatchingInlineSnapshot(
      `"Cannot re-run finished deferred side effects"`,
    );
  });

  test('calling aborted runner', () => {
    let scheduler = jest.fn(() => () => ({}));
    const runner = new DeferredSideEffectsRunner([], scheduler);
    runner.abort();
    runner.run({} as any);
    expect(scheduler).toBeCalledTimes(0);
  });

  test('aborting after scheduled started', () => {
    let task;
    let deferredUpdate = jest.fn(() => {});
    let scheduler = jest.fn((cb) => {
      task = cb;
      return () => ({});
    });
    const runner = new DeferredSideEffectsRunner(
      [
        {
          key: 'some-key',
          effect: { deferredUpdate: deferredUpdate },
          previouslySeenState: {} as any,
        },
      ],
      scheduler,
    );
    runner.run({} as any);
    expect(scheduler).toBeCalledTimes(1);
    runner.abort();
    task();
    expect(deferredUpdate).toBeCalledTimes(0);
  });

  test('task runs', async () => {
    let task;
    let deferredUpdate = jest.fn(() => {});
    let scheduler = jest.fn((cb) => {
      task = cb;
      return () => ({});
    });
    const runner = new DeferredSideEffectsRunner(
      [
        {
          key: 'some-key',
          effect: { deferredUpdate: deferredUpdate },
          previouslySeenState: {} as any,
        },
      ],
      scheduler,
    );
    runner.run({} as any);
    expect(scheduler).toBeCalledTimes(1);
    task();
    await sleep(5);
    expect(deferredUpdate).toBeCalledTimes(1);
  });
});
