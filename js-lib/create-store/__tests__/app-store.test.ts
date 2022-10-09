import { INFINITE_ERROR_SAMPLE, INFINITE_ERROR_THRESHOLD_TIME } from '..';
import { AppState } from '../app-state';
import type { SliceSideEffect } from '../app-state-slice';
import { Slice } from '../app-state-slice';
import type { SchedulerType } from '../app-store';
import { ApplicationStore, DeferredSideEffectsRunner } from '../app-store';
import { SliceKey } from '../slice-key';

function sleep(t = 20): Promise<void> {
  return new Promise((res) => setTimeout(res, t));
}

describe('store', () => {
  test('empty store', () => {
    const state = AppState.create({ slices: [] });
    const store = ApplicationStore.create({ storeName: 'test-store', state });
    expect(store as any).toMatchSnapshot({
      _destroyController: expect.any(AbortController),
    });
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
      slices: [new Slice({ sideEffect: () => ({ deferredUpdate: () => {} }) })],
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
    type ActionType =
      | {
          name: 'for-a';
          value: { n: number };
        }
      | {
          name: 'for-b';
          value: { n: number };
        };

    let state: AppState, store: ApplicationStore<any, ActionType>;

    beforeEach(() => {
      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => 1,
          apply: (action, value, appState) => {
            if (action.name === 'for-a') {
              return action.value.n;
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
              return action.value.n;
            }

            return value;
          },
        },
      });

      state = AppState.create({ slices: [slice1, slice2] });
      store = ApplicationStore.create({ storeName: 'test-store', state });
    });

    test('sets up properly', () => {
      expect(store as any).toMatchSnapshot({
        _destroyController: expect.any(AbortController),
      });
    });

    test('updates', () => {
      store.dispatch({ name: 'for-a', value: { n: 77 } });
      expect(key1.getSliceState(store.state)).toBe(77);
      expect(key2.getSliceState(store.state)).toBe(2);
    });

    test('updates 1', () => {
      store.dispatch({ name: 'for-a', value: { n: 99 } });
      store.dispatch({ name: 'for-b', value: { n: 88 } });
      expect(key1.getSliceState(store.state)).toBe(99);
      expect(key2.getSliceState(store.state)).toBe(88);
    });

    test('dispatch is binded', () => {
      const dispatch = store.dispatch;
      dispatch({ name: 'for-a', value: { n: 99 } });
      expect(key1.getSliceState(store.state)).toBe(99);
    });

    test('destroys', () => {
      store?.destroy();
      expect(store.destroyed).toBe(true);
      expect(store as any).toMatchSnapshot({
        _destroyController: expect.any(AbortController),
      });

      let newState = AppState.create<any, ActionType>({ slices: [] });
      store.updateState(newState);
      expect(store).not.toBe(newState);
    });

    test('after destroying prevent updates', () => {
      store.dispatch({ name: 'for-a', value: { n: 99 } });
      expect(key1.getSliceState(store.state)).toBe(99);
      store?.destroy();
      store.dispatch({ name: 'for-a', value: { n: 100 } });
      expect(key1.getSliceState(store.state)).toBe(99);

      store.dispatch({ name: 'for-b', value: { n: 88 } });
      expect(key2.getSliceState(store.state)).toBe(2);
    });
  });

  describe('side effects', () => {
    const key1 = new SliceKey<number>('one');
    const key2 = new SliceKey<number>('two');

    const setup = (effects1: any) => {
      let state: AppState, store: ApplicationStore;

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

      state = AppState.create({
        slices: [slice1, slice2],
        opts: { test: 'test' },
      });
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
      expect(sideEffect).nthCalledWith(1, store.state, { test: 'test' });
      expect(destroy).toBeCalledTimes(0);
      expect(update).toBeCalledTimes(0);
      let originalState = store.state;
      store.dispatch({ name: 'for-a', value: 100 });

      expect(update).toBeCalledTimes(1);

      expect(update).nthCalledWith(1, store, originalState, 100, 1);
      expect(key1.getSliceState(originalState)).toBe(1);
      expect(key1.getSliceState(store.state)).toBe(100);

      store?.destroy();
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
              return action.value.no;
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

      store.dispatch({ name: 'for-a', value: { no: 100 } });

      expect(sideEffect2Update).toBeCalledTimes(1);
      expect(sideEffect2Update).nthCalledWith(1, store, prevState, 2, 2);

      expect(sideEffect1Update).toBeCalledTimes(1);
      expect(sideEffect1Update).nthCalledWith(1, store, prevState, 100, 1);

      expect(sideEffect2Value).toMatchInlineSnapshot(`
        {
          "curValue": {
            "key1": 100,
            "key2": 2,
          },
          "prevValue": {
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
      expect(sideEffect2).nthCalledWith(1, store.state, undefined);
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

    test('a slice dispatching in effect setup does not change previously seen state for other slices', () => {
      const slice2Action = (
        state: AppState,
        dispatch: ApplicationStore['dispatch'],
      ) => {
        dispatch({ name: 'action::mark-ready' });
      };

      const slice1 = new Slice({
        key: key1,
        sideEffect() {
          return {
            deferredOnce(store) {
              slice2Action(store.state, store.dispatch);
            },
          };
        },
      });

      let seenStates: Array<[number, number]> = [];

      const slice2 = new Slice({
        key: key2,
        state: {
          init: () => {
            return 0;
          },
          apply: (action, state) => {
            if (action.name === 'action::mark-ready') {
              return state + 1;
            }

            return state;
          },
        },
        sideEffect() {
          return {
            update(store, prevState) {
              seenStates.push([
                key2.getSliceStateAsserted(store.state),
                key2.getSliceStateAsserted(prevState),
              ]);
            },
          };
        },
      });

      let store = ApplicationStore.create({
        storeName: 'test-store',
        state: AppState.create({ slices: [slice1, slice2] }),
      });

      store.dispatch({ name: 'random' });

      expect(seenStates).toEqual([
        [1, 0],
        [1, 1],
      ]);
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
              return action.value.no;
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
              return action.value.no;
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
        value: { no: 77 },
      });
      expect(update1).nthCalledWith(1, store, originalState, 77, 2);
      expect(update2).nthCalledWith(1, store, originalState, 77, 2);

      store?.destroy();
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
              value: { data: 'value-b' },
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
              return action.value.data;
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
              return action.value.data;
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
        value: { data: 'value-prep' },
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
        value: { data: 'value-a' },
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
      expect(store as any).toMatchSnapshot({
        _destroyController: expect.any(AbortController),
      });
      expect(sideEffect).toBeCalledTimes(1);
      store.dispatch({
        name: 'hello',
      });
      expect(deferredUpdate).toBeCalledTimes(0);
    });

    describe('deferred for single slice', () => {
      const setup = (
        scheduler: SchedulerType,
        deferredUpdate: ReturnType<SliceSideEffect<any, any>>['deferredUpdate'],
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

        const { store } = setup(scheduler, (store, _, signal) => {
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
        let task: any;
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

        let initialState = store.state;

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
        expect(deferredUpdate).nthCalledWith(
          1,
          store,
          initialState,
          expect.any(AbortSignal),
        );
        expect((deferredUpdate as any).mock.calls[0][2]?.aborted).toBe(false);
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
      store?.destroy();

      expect(destroy1).toBeCalledTimes(1);
      expect(destroy2).toBeCalledTimes(1);
    });
  });

  describe('serializing actions', () => {
    test('works', () => {
      const key1 = new SliceKey<number, ActionType>('one');
      const key2 = new SliceKey<number, ActionType>('two');
      type ActionType =
        | {
            name: 'for-a';
            value: { n: number };
          }
        | {
            name: 'for-b';
            value: { z: { i: number } };
          };

      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => 1,
          apply: (action, value, appState) => {
            if (action.name === 'for-a') {
              return action.value.n;
            }

            return value;
          },
        },
        actions: {
          'for-a': () => ({
            toJSON: (action) => {
              return {
                n: JSON.stringify(action.value.n),
              };
            },
            fromJSON: (obj) => {
              return {
                n: JSON.parse(obj.n),
              };
            },
          }),
          'for-b': () => ({
            toJSON: (action) => {
              return {
                z: action.value.z.i,
              };
            },
            fromJSON: (obj) => {
              return {
                z: { i: obj.z },
              };
            },
          }),
        },
      });

      const slice2 = new Slice({
        key: key2,
        state: {
          init: () => 2,
          apply: (action, value, appState) => {
            if (action.name === 'for-b') {
              return action.value.z.i;
            }

            return value;
          },
        },
      });

      const store = ApplicationStore.create({
        storeName: 'test-store',
        state: AppState.create({ slices: [slice1, slice2] }),
      });

      const action: ActionType = {
        name: 'for-a',
        value: {
          n: 12,
        },
      };

      expect(store.serializeAction(action)).toEqual({
        name: 'for-a',
        serializedValue: {
          n: '12',
        },
        storeName: 'test-store',
      });

      expect(store.parseAction(store.serializeAction(action) as any)).toEqual({
        fromStore: 'test-store',
        name: 'for-a',
        value: {
          n: 12,
        },
      });
    });

    test('multipe slices', () => {
      const key1 = new SliceKey('one');
      const key2 = new SliceKey('two');

      const slice1 = new Slice({
        key: key1,
        actions: {
          'for-a': () => ({
            toJSON: (action) => {
              return {
                foo: 1,
              };
            },
            fromJSON: (obj) => {
              return {
                foo: 1,
              };
            },
          }),
        },
      });
      const slice2 = new Slice({
        key: key2,
        actions: {
          'for-b': () => ({
            toJSON: (action) => {
              return {
                boo: 1,
              };
            },
            fromJSON: (obj) => {
              return {
                boo: 1,
              };
            },
          }),
        },
      });

      const store = ApplicationStore.create({
        storeName: 'test-store',
        state: AppState.create({ slices: [slice1, slice2] }),
      });

      const action = {
        name: 'for-a',
        value: {},
      };

      expect(store.serializeAction(action)).toEqual({
        name: 'for-a',
        serializedValue: {
          foo: 1,
        },
        storeName: 'test-store',
      });

      expect(store.parseAction(store.serializeAction(action) as any)).toEqual({
        fromStore: 'test-store',
        name: 'for-a',
        value: {
          foo: 1,
        },
      });

      expect(
        store.parseAction(
          store.serializeAction({
            name: 'for-b',
          }) as any,
        ),
      ).toEqual({
        name: 'for-b',
        value: {
          boo: 1,
        },
        fromStore: 'test-store',
      });
    });

    test('action with no value', () => {
      const slice1 = new Slice({
        actions: {
          'for-a': () => ({
            toJSON: (action) => {
              return undefined;
            },
            fromJSON: (obj) => {
              return undefined;
            },
          }),
        },
      });

      const store = ApplicationStore.create({
        storeName: 'test-store',
        state: AppState.create({ slices: [slice1] }),
      });

      expect(
        store.serializeAction({
          name: 'for-a',
        }),
      ).toEqual({
        name: 'for-a',
        serializedValue: undefined,
        storeName: 'test-store',
      });

      expect(
        store.parseAction(
          store.serializeAction({
            name: 'for-a',
          }) as any,
        ),
      ).toEqual({
        name: 'for-a',
        fromStore: 'test-store',
        value: undefined,
      });
    });
  });

  describe('side effect erroring', () => {
    // second slice will always throw error
    const setup = ({
      errorHandler1,
      errorHandler2,
      errorHandler3,
      rootErrorHandler,
    }: any) => {
      const key1 = new SliceKey<number, any>('one');
      const key2 = new SliceKey<number, any>('two');
      const key3 = new SliceKey<number, any>('three');
      let updateCalls = {
        one: 0,
        two: 0,
        three: 0,
      };
      const slice1 = new Slice({
        key: key1,
        onError: errorHandler1,
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
            update() {
              updateCalls.one++;
            },
          };
        },
      });

      const slice2 = new Slice({
        key: key2,
        onError: errorHandler2,
        state: {
          init: () => 2,
          apply: (action, value, appState) => {
            return value;
          },
        },
        sideEffect() {
          return {
            update() {
              updateCalls.two++;

              throw new Error('test-error');
            },
          };
        },
      });

      const slice3 = new Slice({
        key: key3,
        onError: errorHandler3,
        state: {
          init: () => 3,
          apply: (action, value, appState) => {
            return value;
          },
        },
        sideEffect() {
          return {
            update() {
              updateCalls.three++;
            },
          };
        },
      });

      let state = AppState.create({
        slices: [slice1, slice2, slice3],
        opts: { test: 'test' },
      });

      let store = ApplicationStore.create({
        storeName: 'test-store',
        state,
        onError: rootErrorHandler,
      });

      return { store, slice1, slice2, slice3, updateCalls };
    };

    test('error is handled', () => {
      const errorHandler1 = jest.fn(() => {
        return false;
      });
      const errorHandler2 = jest.fn(() => {
        return false;
      });
      const errorHandler3 = jest.fn(() => {
        return false;
      });
      const rootErrorHandler = jest.fn((error, store) => {
        return true;
      });

      const { store, updateCalls } = setup({
        errorHandler1,
        errorHandler2,
        errorHandler3,
        rootErrorHandler,
      });

      expect(() =>
        store.dispatch({
          name: 'for-a',
        }),
      ).not.toThrowError();

      expect(rootErrorHandler).toBeCalledTimes(1);
      expect(rootErrorHandler).nthCalledWith(1, expect.any(Error), store);
      expect(updateCalls).toEqual({
        one: 1,
        two: 1,
        three: 1,
      });
    });

    test('error propagates in correct order', () => {
      let callOrder = '';
      const errorHandler1 = jest.fn(() => {
        callOrder += '1';

        return false;
      });
      const errorHandler2 = jest.fn(() => {
        callOrder += '2';

        return false;
      });
      const errorHandler3 = jest.fn(() => {
        callOrder += '3';

        return false;
      });
      const rootErrorHandler = jest.fn((error, store: ApplicationStore) => {
        callOrder += 'root';

        return store.runSliceErrorHandlers(error);
      });

      const { store } = setup({
        errorHandler1,
        errorHandler2,
        errorHandler3,
        rootErrorHandler,
      });
      expect(() =>
        store.dispatch({
          name: 'for-b',
        }),
      ).toThrowErrorMatchingInlineSnapshot(`"test-error"`);

      expect(rootErrorHandler).toBeCalledTimes(1);
      expect(errorHandler1).toBeCalledTimes(1);
      expect(errorHandler2).toBeCalledTimes(1);

      // 2 should be called before 1 & 3 because the error originated there
      expect(callOrder).toBe('root213');
    });

    test('if root handles the error, no other handler is called', () => {
      let callOrder = '';
      const errorHandler1 = jest.fn(() => {
        callOrder += '1';

        return false;
      });
      const errorHandler2 = jest.fn(() => {
        callOrder += '2';

        return false;
      });
      const errorHandler3 = jest.fn(() => {
        callOrder += '3';

        return false;
      });
      const rootErrorHandler = jest.fn((error, store: ApplicationStore) => {
        callOrder += 'root';

        return true;
      });

      const { store, updateCalls } = setup({
        errorHandler1,
        errorHandler2,
        errorHandler3,
        rootErrorHandler,
      });
      expect(() =>
        store.dispatch({
          name: 'for-b',
        }),
      ).not.toThrowError();

      expect(rootErrorHandler).toBeCalledTimes(1);

      // 2 should be called before 1 & 3 because the error originated there
      expect(callOrder).toBe('root');
      expect(updateCalls).toEqual({
        one: 1,
        two: 1,
        three: 1,
      });
    });

    test('if one slice handles error', () => {
      let callOrder = '';
      const errorHandler1 = jest.fn(() => {
        callOrder += '1';

        return true;
      });
      const errorHandler2 = jest.fn(() => {
        callOrder += '2';

        return false;
      });
      const errorHandler3 = jest.fn(() => {
        callOrder += '3';

        return false;
      });
      const rootErrorHandler = jest.fn((error, store: ApplicationStore) => {
        callOrder += 'root';

        return store.runSliceErrorHandlers(error);
      });

      const { store } = setup({
        errorHandler1,
        errorHandler2,
        errorHandler3,
        rootErrorHandler,
      });
      expect(() =>
        store.dispatch({
          name: 'for-b',
        }),
      ).not.toThrowError();

      expect(rootErrorHandler).toBeCalledTimes(1);

      expect(callOrder).toBe('root21');
    });
  });

  describe('deferred sife effects erroring', () => {
    // second slice will always throw error
    const setup = ({
      errorHandler1,
      errorHandler2,
      errorHandler3,
      rootErrorHandler,
    }: any) => {
      const key1 = new SliceKey<number, any>('one');
      const key2 = new SliceKey<number, any>('two');
      const key3 = new SliceKey<number, any>('three');
      let deferredCalls = {
        one: 0,
        two: 0,
        three: 0,
      };

      const slice1 = new Slice({
        key: key1,
        onError: errorHandler1,
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
            update() {},
            deferredUpdate() {
              deferredCalls.one++;
            },
          };
        },
      });

      const slice2 = new Slice({
        key: key2,
        onError: errorHandler2,
        state: {
          init: () => 2,
          apply: (action, value, appState) => {
            return value;
          },
        },
        sideEffect() {
          return {
            deferredUpdate() {
              deferredCalls.two++;
              throw new Error('test-error');
            },
          };
        },
      });

      const slice3 = new Slice({
        key: key3,
        onError: errorHandler3,
        state: {
          init: () => 3,
          apply: (action, value, appState) => {
            return value;
          },
        },
        sideEffect() {
          return {
            update() {},
            deferredUpdate() {
              deferredCalls.three++;
            },
          };
        },
      });

      let state = AppState.create({
        slices: [slice1, slice2, slice3],
        opts: { test: 'test' },
      });

      let store = ApplicationStore.create({
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
        onError: rootErrorHandler,
      });

      return { store, slice1, slice2, slice3, deferredCalls };
    };

    test('error is handled', async () => {
      let handlerCallOrder = '';
      const errorHandler1 = jest.fn(() => {
        handlerCallOrder += '1';

        return false;
      });
      const errorHandler2 = jest.fn(() => {
        handlerCallOrder += '2';

        return true;
      });
      const errorHandler3 = jest.fn(() => {
        handlerCallOrder += '3';

        return false;
      });
      const rootErrorHandler = jest.fn((error, store: ApplicationStore) => {
        handlerCallOrder += 'root';

        return store.runSliceErrorHandlers(error);
      });

      const { store, deferredCalls } = setup({
        errorHandler1,
        errorHandler2,
        errorHandler3,
        rootErrorHandler,
      });

      expect(() =>
        store.dispatch({
          name: 'for-a',
        }),
      ).not.toThrowError();

      await sleep(0);

      expect(rootErrorHandler).toBeCalledTimes(1);
      expect(rootErrorHandler).nthCalledWith(1, expect.any(Error), store);
      expect(handlerCallOrder).toEqual('root2');

      // deferred update calls should still be made
      expect(deferredCalls).toEqual({
        one: 1,
        two: 1,
        three: 1,
      });
    });
  });

  describe('deferred once sife effect  handles error', () => {
    // second slice will always throw error
    const setup = ({
      errorHandler1,
      errorHandler2,
      errorHandler3,
      rootErrorHandler,
    }: any) => {
      const key1 = new SliceKey<number, any>('one');
      const key2 = new SliceKey<number, any>('two');
      const key3 = new SliceKey<number, any>('three');
      let deferredOnceCalls = {
        one: 0,
        two: 0,
        three: 0,
      };

      const slice1 = new Slice({
        key: key1,
        onError: errorHandler1,
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
            deferredOnce() {
              deferredOnceCalls.one++;
            },
          };
        },
      });

      const slice2 = new Slice({
        key: key2,
        onError: errorHandler2,
        state: {
          init: () => 2,
          apply: (action, value, appState) => {
            return value;
          },
        },
        sideEffect() {
          return {
            deferredOnce() {
              deferredOnceCalls.two++;
              throw new Error('test-error');
            },
          };
        },
      });

      const slice3 = new Slice({
        key: key3,
        onError: errorHandler3,
        state: {
          init: () => 3,
          apply: (action, value, appState) => {
            return value;
          },
        },
        sideEffect() {
          return {
            update() {},
            deferredOnce() {
              deferredOnceCalls.three++;
            },
          };
        },
      });

      let state = AppState.create({
        slices: [slice1, slice2, slice3],
        opts: { test: 'test' },
      });

      let store = ApplicationStore.create({
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
        onError: rootErrorHandler,
      });

      return {
        store,
        slice1,
        slice2,
        slice3,
        deferredCalls: deferredOnceCalls,
      };
    };

    test('a deferred once throwing error should not disrupt other handlers', async () => {
      let handlerCallOrder = '';
      const errorHandler1 = jest.fn(() => {
        handlerCallOrder += '1';

        return false;
      });
      const errorHandler2 = jest.fn(() => {
        handlerCallOrder += '2';

        return true;
      });
      const errorHandler3 = jest.fn(() => {
        handlerCallOrder += '3';

        return false;
      });
      const rootErrorHandler = jest.fn((error, store: ApplicationStore) => {
        handlerCallOrder += 'root';

        return store.runSliceErrorHandlers(error);
      });

      const { store, deferredCalls } = setup({
        errorHandler1,
        errorHandler2,
        errorHandler3,
        rootErrorHandler,
      });
      store.dispatch({
        name: 'for-a',
      });

      await sleep(0);

      expect(rootErrorHandler).toBeCalledTimes(1);
      expect(handlerCallOrder).toEqual('root2');
      expect(deferredCalls).toEqual({
        one: 1,
        two: 1,
        three: 1,
      });
    });
  });

  describe('deferred once', () => {
    test('when store is destroyed, deferredOnce abortSignal is called', () => {
      const key1 = new SliceKey<number, any>('one');

      const onAbort = jest.fn();
      const deferredOnce = jest.fn();
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
            deferredOnce(_, signal) {
              deferredOnce();
              signal.addEventListener(
                'abort',
                () => {
                  onAbort();
                },
                {
                  once: true,
                },
              );
            },
          };
        },
      });

      let state = AppState.create({
        slices: [slice1],
      });

      let store = ApplicationStore.create({
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

      expect(deferredOnce).toBeCalledTimes(1);
      expect(onAbort).not.toBeCalled();

      store.dispatch({ name: 'for-a', value: { n: 99 } });
      expect(onAbort).not.toBeCalled();

      expect(key1.getSliceStateAsserted(store.state)).toEqual({ n: 99 });

      store?.destroy();

      store.dispatch({ name: 'for-a', value: { n: 19 } });

      expect(onAbort).toBeCalledTimes(1);
      expect(deferredOnce).toBeCalledTimes(1);

      expect(key1.getSliceStateAsserted(store.state)).toEqual({ n: 99 });
    });
  });

  describe('infinite errors', () => {
    test('throws error if many errors are thrown in short span', () => {
      let state = AppState.create({
        slices: [],
        opts: { test: 'test' },
      });

      let store = ApplicationStore.create({
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
        onError: () => true,
      });

      // 2x, since the first time it hits counter % INFINITE_ERROR_SAMPLE == 0, infiniteErrors.lastSeen was 0.
      for (let i = 0; i < 2 * INFINITE_ERROR_SAMPLE - 1; i++) {
        store.errorHandler(new Error('test'));
      }
      let consoleError = console.error;
      console.error = jest.fn();
      expect(() =>
        store.errorHandler(new Error('final test')),
      ).toThrowErrorMatchingInlineSnapshot(
        `"AppStore: avoiding possible infinite errors"`,
      );

      console.error = consoleError;
    });

    test('ignores if outside time bound', () => {
      let state = AppState.create({
        slices: [],
        opts: { test: 'test' },
      });

      let store = ApplicationStore.create({
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
        onError: () => true,
      });

      let originalDateNow = Date.now;
      Date.now = jest.fn(() => INFINITE_ERROR_THRESHOLD_TIME * 2);

      // 2x, since the first time it hits counter % INFINITE_ERROR_SAMPLE == 0, infiniteErrors.lastSeen was 0.
      for (let i = 0; i < 2 * INFINITE_ERROR_SAMPLE - 1; i++) {
        store.errorHandler(new Error('test'));
      }

      Date.now = jest.fn(() => INFINITE_ERROR_THRESHOLD_TIME * 4);

      let consoleError = console.error;
      console.error = jest.fn();
      expect(() =>
        store.errorHandler(new Error('final test')),
      ).not.toThrowError();

      console.error = consoleError;
      Date.now = originalDateNow;
    });
  });
});

describe('DeferredSideEffectsRunner', () => {
  let onError = jest.fn();

  test('calling run again throws error', () => {
    const runner = new DeferredSideEffectsRunner([], () => () => ({}));
    runner.run({} as any, onError);
    expect(() =>
      runner.run({} as any, onError),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot re-run finished deferred side effects"`,
    );
  });

  test('calling aborted runner', () => {
    let scheduler = jest.fn(() => () => ({}));
    const runner = new DeferredSideEffectsRunner([], scheduler);
    runner.abort();
    runner.run({} as any, onError);
    expect(scheduler).toBeCalledTimes(0);
  });

  test('aborting after scheduled started', () => {
    let task: any;
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
          initialState: {} as any,
        },
      ],
      scheduler,
    );
    runner.run({} as any, onError);
    expect(scheduler).toBeCalledTimes(1);
    runner.abort();
    task();
    expect(deferredUpdate).toBeCalledTimes(0);
  });

  test('task runs', async () => {
    let task: any;
    let deferredUpdate = jest.fn(() => {});
    let scheduler = jest.fn((cb) => {
      task = cb;

      return () => ({});
    });
    let initialState = { initialState: 'i am initial state' };

    const effects = [
      {
        key: 'some-key',
        effect: { deferredUpdate: deferredUpdate },
        initialState: initialState as any,
      },
    ];
    let runner = new DeferredSideEffectsRunner(effects, scheduler);

    let prevState1 = { 'prev-state1': 'i am prev state 1' };

    let store1 = { state: prevState1 } as any;
    runner.run(store1, onError);
    expect(scheduler).toBeCalledTimes(1);
    task();
    await sleep(5);
    expect(deferredUpdate).toBeCalledTimes(1);
    expect(deferredUpdate).nthCalledWith(
      1,
      store1,
      initialState,
      expect.any(AbortSignal),
    );

    let prevState2 = { 'prev-state2': 'i am prev state 2' };

    let store2 = { state: prevState2 } as any;

    new DeferredSideEffectsRunner(effects, scheduler).run(store2, onError);
    task();
    await sleep(5);

    expect(deferredUpdate).toBeCalledTimes(2);
    expect(deferredUpdate).nthCalledWith(
      2,
      store2,
      prevState1,
      expect.any(AbortSignal),
    );
  });
});

describe('reactors', () => {
  const slice1Key = new SliceKey<
    { count: number; magicString: string },
    {
      name: 'change-count';
      value: {};
    }
  >('slice-1');

  const makeSlice1 = (reactors: Array<ReturnType<typeof slice1Key.reactor>>) =>
    new Slice({
      key: slice1Key,
      state: {
        init() {
          return { count: 1, magicString: 'hello' };
        },
        apply: (action, value) => {
          if (action.name === 'change-count') {
            return {
              ...value,
              count: value.count + 1,
            };
          }

          return value;
        },
      },
      sideEffect: [...reactors],
    });

  const slice2Key = new SliceKey<
    { toggle: boolean; someString: string; someNumber: number },
    | {
        name: 'toggle-action';
        value: {};
      }
    | {
        name: 'change-some-string';
        value: {
          someString: string;
        };
      }
  >('slice-1');

  const makeSlice2 = (reactors: Array<ReturnType<typeof slice2Key.reactor>>) =>
    new Slice({
      key: slice2Key,
      state: {
        init() {
          return { toggle: false, someString: 'hello', someNumber: 1 };
        },
        apply: (action, value) => {
          if (action.name === 'toggle-action') {
            return {
              ...value,
              toggle: !value.toggle,
            };
          } else if (action.name === 'change-some-string') {
            return {
              ...value,
              someString: action.value.someString,
            };
          }

          return value;
        },
      },
      sideEffect: [...reactors],
    });

  test('one slice test', () => {
    let reactor1Call = jest.fn();

    const slice1 = makeSlice1([
      slice1Key.reactor(
        {
          count: slice1Key.select('count'),
        },
        reactor1Call,
      ),
    ]);

    const state = AppState.create({ slices: [slice1] });
    const store = ApplicationStore.create({
      storeName: 'test-store',
      state,
    });

    store.dispatch({
      name: 'change-count',
      value: {},
    });

    expect(reactor1Call).toBeCalledTimes(1);
    expect(reactor1Call).nthCalledWith(1, store.state, store.dispatch, {
      count: 2,
    });
  });

  test('with two slices', () => {
    let reactor2Call = jest.fn();
    let reactor21Call = jest.fn();

    const slice1 = makeSlice1([]);

    const slice2 = makeSlice2([
      slice2Key.reactor(
        {
          count: slice1Key.select('count'),
          toggle: slice2Key.select('toggle'),
        },
        reactor2Call,
      ),

      slice2Key.reactor(
        {
          count: slice1Key.select('count'),
          someString: slice2Key.select('someString'),
        },
        reactor21Call,
      ),
    ]);

    const state = AppState.create({ slices: [slice1, slice2] as Slice[] });
    const store = ApplicationStore.create({
      storeName: 'test-store',
      state,
    });

    store.dispatch({
      name: 'toggle-action',
      value: {},
    });

    expect(reactor2Call).toBeCalledTimes(1);
    expect(reactor2Call).nthCalledWith(1, store.state, store.dispatch, {
      count: 1,
      toggle: true,
    });

    // this reactor should not be called as its dependencies are not changed
    expect(reactor21Call).toBeCalledTimes(0);

    store.dispatch({
      name: 'toggle-action',
      value: {},
    });

    expect(reactor2Call).toBeCalledTimes(2);
    expect(reactor2Call).nthCalledWith(2, store.state, store.dispatch, {
      count: 1,
      toggle: false,
    });
    // now actually changing the dependency
    expect(reactor21Call).toBeCalledTimes(0);
    store.dispatch({
      name: 'change-some-string',
      value: {
        someString: 'world',
      },
    });

    expect(reactor2Call).toBeCalledTimes(2);
    expect(reactor21Call).toBeCalledTimes(1);

    expect(reactor21Call).nthCalledWith(1, store.state, store.dispatch, {
      someString: 'world',
      count: 1,
    });

    // if we change the dependency again, the reactor should not be called again
    store.dispatch({
      name: 'change-some-string',
      value: {
        someString: 'world',
      },
    });

    expect(reactor21Call).toBeCalledTimes(1);
    expect(reactor2Call).toBeCalledTimes(2);
  });
});
