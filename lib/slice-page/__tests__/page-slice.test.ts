import { pageSliceKey } from '../common';
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
      "lifeCycleState": Object {
        "current": undefined,
        "previous": undefined,
      },
      "location": Object {
        "pathname": undefined,
        "search": undefined,
      },
      "pendingNavigation": undefined,
    }
  `);
});

describe('updating state', () => {
  test('upload lifecycle', () => {
    const { store } = createStore();
    let state = store.state;

    state = state.applyAction({
      name: 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: { current: 'active', previous: 'frozen' },
    });

    expect(pageSliceKey.getSliceState(state)?.lifeCycleState).toEqual({
      current: 'active',
      previous: 'frozen',
    });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE',
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
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      value: { block: true },
    });

    expect(pageSliceKey.getSliceState(state)?.blockReload).toBe(true);

    state = state.applyAction({
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      value: { block: false },
    });

    expect(pageSliceKey.getSliceState(state)?.blockReload).toBe(false);
  });
});
