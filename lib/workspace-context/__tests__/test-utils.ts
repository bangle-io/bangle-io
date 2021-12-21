import { ApplicationStore, AppState } from '@bangle.io/create-store';

import { JSON_SCHEMA_VERSION, workspaceSlice } from '..';
import { WorkspaceStateKeys } from '../slice-state';

const args = {
  onNativefsAuthError: jest.fn(),
  onWorkspaceNotFound: jest.fn(),
  onInvalidPath: jest.fn(),
};
export const createState = (
  data: Partial<{ [K in WorkspaceStateKeys]: any }> = {},
) => {
  return AppState.stateFromJSON({
    slices: [workspaceSlice(args)],
    json: {
      workspace: { version: JSON_SCHEMA_VERSION, data: data },
    },
    sliceFields: { workspace: workspaceSlice(args) },
  });
};

export const createStore = (data?: Parameters<typeof createState>[0]) => {
  const store = ApplicationStore.create({
    scheduler: (cb) => {
      cb();
      return () => {};
    },
    storeName: 'editor-store',
    state: data
      ? createState(data)
      : AppState.create({ slices: [workspaceSlice(args)] }),
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return { store, dispatchSpy };
};

export const createStateWithWsName = (wsName: string) => {
  return createState({
    locationPathname: '/ws/' + wsName,
  });
};

export const getActionsDispatched = (mockDispatch) =>
  mockDispatch.mock.calls.map((r) => r[0].name);
