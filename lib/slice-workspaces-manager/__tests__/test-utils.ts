import { ApplicationStore, AppState, Slice } from '@bangle.io/create-store';
import { pageSlice } from '@bangle.io/slice-page';

import { WorkspaceInfo, WorkspaceType } from '../common';
import { workspacesSlice } from '../workspaces-slice';

export const createState = () => {
  return AppState.create({
    slices: [workspacesSlice(), pageSlice()] as Slice[],
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
  disableSideEffects = false,
) => {
  const store = ApplicationStore.create<any, any>({
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

export const createWsInfo = (obj: Partial<WorkspaceInfo>): WorkspaceInfo => {
  return {
    name: 'test-ws-info',
    type: WorkspaceType['browser'],
    lastModified: 0,
    metadata: {},
    ...obj,
  };
};
