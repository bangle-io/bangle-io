import type { JsonArray } from 'type-fest';

import { ApplicationStore, AppState } from '@bangle.io/create-store';
import type { JsonPrimitive } from '@bangle.io/shared-types';

import { JSON_SCHEMA_VERSION, workspaceSlice } from '../workspace-slice';
import { WorkspaceStateKeys } from '../workspace-slice-state';

export const createState = (
  // we are adding JsonPrimitive since we this data to restore state
  data: Partial<{
    [K in WorkspaceStateKeys]: JsonPrimitive | JsonArray | undefined;
  }> = {},
) => {
  return AppState.stateFromJSON({
    slices: [workspaceSlice()],
    json: {
      workspace: { version: JSON_SCHEMA_VERSION, data: data },
    },
    sliceFields: {
      workspace: workspaceSlice(),
    },
  });
};

export const createStateWithWsName = (
  wsName: string,
  data: Parameters<typeof createState>[0] = {},
) => {
  return createState({
    wsName: wsName,
    ...data,
  });
};

// A store where no actions are actually dispatched
// useful for testing operations
export const noDispatchStore = (data?: Parameters<typeof createState>[0]) => {
  return createStore(data, jest.fn());
};

// A store where no actions are actually dispatched
// useful for testing operations
export const noSideEffectsStore = (
  data?: Parameters<typeof createState>[0],
) => {
  return createStore(data, undefined, true);
};

export const createStore = (
  data?: Parameters<typeof createState>[0],
  scheduler = (cb) => {
    cb();
    return () => {};
  },
  disableSideEffects = false,
) => {
  const store = ApplicationStore.create({
    scheduler: scheduler,
    storeName: 'workspace-store',
    state: data
      ? createState(data)
      : AppState.create({ slices: [workspaceSlice()] }),
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
