import type { JsonArray } from 'type-fest';

import { WorkspaceType } from '@bangle.io/constants';
import { ApplicationStore, AppState, Slice } from '@bangle.io/create-store';
import {
  Extension,
  extensionRegistrySlice,
} from '@bangle.io/extension-registry';
import type { JsonPrimitive, WorkspaceInfo } from '@bangle.io/shared-types';
import { pageSlice } from '@bangle.io/slice-page';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createExtensionRegistry } from '@bangle.io/test-utils';

import { WorkspaceSliceAction } from '../common';
import { JSON_SCHEMA_VERSION, workspaceSlice } from '../workspace-slice';
import {
  WorkspaceSliceState,
  WorkspaceStateKeys,
} from '../workspace-slice-state';

export const createState = (
  // we are adding JsonPrimitive since we this data to restore state
  data: Partial<{
    [K in WorkspaceStateKeys]: JsonPrimitive | JsonArray | undefined;
  }> = {},
  additionalSlices: Slice[] = [],
  opts?: { [key: string]: any },
) => {
  return AppState.stateFromJSON<WorkspaceSliceState, WorkspaceSliceAction>({
    opts,
    slices: [workspaceSlice(), pageSlice(), ...additionalSlices] as Slice[],
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

export const noDispatchStore = (data?: Parameters<typeof createState>[0]) => {
  return createStore(data, jest.fn());
};

export const noSideEffectsStore = (
  data?: Parameters<typeof createState>[0],
) => {
  return createStore(data, undefined, true);
};

export const createStore = (
  data?: Parameters<typeof createState>[0],
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
  additionalSlices: Slice[] = [],
) => {
  let extensionRegistry = createExtensionRegistry(
    [
      Extension.create({
        name: 'test-extension',
        application: {
          storageProvider: new IndexedDbStorageProvider(),
          onStorageError: () => false,
        },
      }),
    ],
    {
      editorCore: false,
    },
  );

  let opts = {
    extensionRegistry,
  };

  const store = ApplicationStore.create({
    scheduler: scheduler,
    storeName: 'workspace-store',
    state: data
      ? createState(data, additionalSlices, opts)
      : AppState.create({
          opts,
          slices: [
            workspaceSlice(),
            pageSlice(),
            extensionRegistrySlice(),
            ...additionalSlices,
          ] as Slice[],
        }),
    disableSideEffects,
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return {
    store,
    dispatchSpy,
    getActionNames: () => {
      return getActionNamesDispatched(dispatchSpy);
    },
    getAction: (name: string) => {
      return getActionsDispatched(dispatchSpy, name);
    },
  };
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
