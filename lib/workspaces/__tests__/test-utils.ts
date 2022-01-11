import { ApplicationStore, AppState } from '@bangle.io/create-store';

import { workspacesSlice } from '../workspaces-slice';

export const createState = () => {
  return AppState.create({
    slices: [workspacesSlice()],
  });
};

export const noDispatchStore = () => {
  return createStore(jest.fn());
};

// A store where no sideeffects are run
export const noSideEffectsStore = () => {
  return createStore(undefined, true);
};

export const createStore = (
  scheduler = (cb) => {
    cb();
    return () => {};
  },
  disableSideEffects = false,
) => {
  const store = ApplicationStore.create({
    scheduler: scheduler,
    storeName: 'workspaces-store',
    state: createState(),
    disableSideEffects,
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return { store, dispatchSpy };
};

export const getActionNamesDispatched = (mockDispatch) =>
  mockDispatch.mock.calls.map((r) => r[0].name);

export const getActionsDispatched = (mockDispatch, name) => {
  const actions = mockDispatch.mock.calls.map((r) => r[0]);

  if (name) {
    return actions.filter((r) => r.name === name);
  }

  return actions;
};
