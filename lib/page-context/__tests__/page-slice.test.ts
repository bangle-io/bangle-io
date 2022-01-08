import { pageSlice, pageSliceKey } from '..';
import { createStore, lifeCycleMock } from './test-utils';

beforeEach(() => {
  lifeCycleMock.addEventListener.mockImplementation(() => {});
  lifeCycleMock.removeEventListener.mockImplementation(() => {});
});

test('sets up', () => {
  const { store } = createStore();

  expect(pageSliceKey.getSliceState(store.state)).toMatchInlineSnapshot(`
    Object {
      "blockReload": false,
      "history": BrowserHistory {
        "base": "",
        "checkForUpdates": [Function],
        "currentLoc": Object {
          "pathname": "/",
          "search": "",
        },
        "historyCounter": 0,
        "host": [Window],
        "onChange": [Function],
      },
      "historyChangedCounter": 0,
      "lifeCycleState": Object {
        "current": undefined,
      },
      "location": Object {
        "pathname": "/",
        "search": "",
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
        "addUnsavedChanges": [MockFunction],
        "removeEventListener": [MockFunction],
        "removeUnsavedChanges": [MockFunction],
      },
    }
  `);
});

describe('updating state', () => {
  test('upload lifecycle', () => {
    const { store } = createStore();
    let state = store.state;

    state = state.applyAction({
      name: 'action::@bangle.io/page-context:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: { current: 'active', previous: 'frozen' },
    });

    expect(pageSliceKey.getSliceState(state)?.lifeCycleState).toEqual({
      current: 'active',
      previous: 'frozen',
    });

    state = state.applyAction({
      name: 'action::@bangle.io/page-context:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: { current: 'frozen', previous: 'active' },
    });

    expect(pageSliceKey.getSliceState(state)?.lifeCycleState).toEqual({
      current: 'frozen',
      previous: 'active',
    });
  });

  test('blocking reload', () => {
    const { store } = createStore();
    let state = store.state;

    state = state.applyAction({
      name: 'action::@bangle.io/page-context:BLOCK_RELOAD',
      value: { block: true },
    });

    expect(pageSliceKey.getSliceState(state)?.blockReload).toBe(true);

    state = state.applyAction({
      name: 'action::@bangle.io/page-context:BLOCK_RELOAD',
      value: { block: false },
    });

    expect(pageSliceKey.getSliceState(state)?.blockReload).toBe(false);
  });
});
