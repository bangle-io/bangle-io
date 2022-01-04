import {
  ApplicationStore,
  AppState,
  BaseAction,
} from '@bangle.io/create-store';

import { pageSlice } from '../page-slice';

export const lifeCycleMock = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  removeUnsavedChanges: jest.fn(),
  addUnsavedChanges: jest.fn(),
};

export const createStore = () => {
  let actionsDispatched: BaseAction[] = [];
  const store = ApplicationStore.create({
    scheduler: (cb) => {
      cb();
      return () => {};
    },
    storeName: 'test-store',
    dispatchAction: (store, action) => {
      let newState = store.state.applyAction(action);
      store.updateState(newState);
      actionsDispatched.push(action);
    },
    state: AppState.create({
      opts: { lifecycle: lifeCycleMock },

      slices: [pageSlice()],
    }),
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return { store, dispatchSpy, actionsDispatched };
};
