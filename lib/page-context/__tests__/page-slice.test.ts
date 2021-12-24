import { ApplicationStore, AppState } from '@bangle.io/create-store';

import { pageSlice, pageSliceKey } from '..';

const lifeCycleMock = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

beforeEach(() => {
  lifeCycleMock.addEventListener.mockImplementation(() => {});
  lifeCycleMock.removeEventListener.mockImplementation(() => {});
});

let createStore = () =>
  ApplicationStore.create({
    scheduler: (cb) => {
      cb();
      return () => {};
    },
    storeName: 'editor-store',
    state: AppState.create({
      opts: { lifecycle: lifeCycleMock },
      slices: [pageSlice()],
    }),
  });

test('sets up', () => {
  const store = createStore();

  expect(pageSliceKey.getSliceState(store.state)).toMatchInlineSnapshot(`
    Object {
      "blockReload": false,
      "lifeCycleState": Object {
        "current": undefined,
      },
      Symbol(lifecycle): Object {
        "addEventListener": [MockFunction] {
          "calls": Array [
            Array [
              "statechange",
              [Function],
            ],
          ],
          "results": Array [
            Object {
              "type": "return",
              "value": undefined,
            },
          ],
        },
        "removeEventListener": [MockFunction],
      },
    }
  `);
});

describe('updating state', () => {
  test('upload lifecycle', () => {
    const store = createStore();
    let state = store.state;

    state = state.applyAction({
      name: 'action::page-slice:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: { current: 'active', previous: 'frozen' },
    });

    expect(pageSliceKey.getSliceState(state)?.lifeCycleState).toEqual({
      current: 'active',
      previous: 'frozen',
    });

    state = state.applyAction({
      name: 'action::page-slice:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: { current: 'frozen', previous: 'active' },
    });

    expect(pageSliceKey.getSliceState(state)?.lifeCycleState).toEqual({
      current: 'frozen',
      previous: 'active',
    });
  });

  test('blocking reload', () => {
    const store = createStore();
    let state = store.state;

    state = state.applyAction({
      name: 'action::page-slice:BLOCK_RELOAD',
      value: true,
    });

    expect(pageSliceKey.getSliceState(state)?.blockReload).toBe(true);

    state = state.applyAction({
      name: 'action::page-slice:BLOCK_RELOAD',
      value: false,
    });

    expect(pageSliceKey.getSliceState(state)?.blockReload).toBe(false);
  });
});
