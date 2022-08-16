import type { JsonArray } from 'type-fest';

import { WorkspaceTypeBrowser } from '@bangle.io/constants';
import type { Slice } from '@bangle.io/create-store';
import { AppState } from '@bangle.io/create-store';
import {
  Extension,
  extensionRegistrySlice,
} from '@bangle.io/extension-registry';
import type { JsonPrimitive, WorkspaceInfo } from '@bangle.io/shared-types';
import { pageSlice } from '@bangle.io/slice-page';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import {
  createExtensionRegistry,
  createTestStore,
} from '@bangle.io/test-utils';

import type { WorkspaceSliceAction } from '../common';
import { JSON_SCHEMA_VERSION, workspaceSlice } from '../workspace-slice';
import type {
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

export const noSideEffectsStore = (
  signal: AbortSignal,
  data?: Parameters<typeof createState>[0],
) => {
  return createStore({ data, disableSideEffects: true, signal });
};

export const createStore = ({
  signal,
  data,
  disableSideEffects,
  additionalSlices = [],
}: {
  signal: AbortSignal;
  data?: Parameters<typeof createState>[0];
  disableSideEffects?: boolean;
  additionalSlices?: Slice[];
}) => {
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

  let result = createTestStore({
    storeName: 'workspace-store',
    disableSideEffects,
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
  });

  signal.addEventListener(
    'abort',
    () => {
      result.store.destroy();
    },
    {
      once: true,
    },
  );

  return result;
};

export const getActionNamesDispatched = (mockDispatch: jest.SpyInstance) =>
  mockDispatch.mock.calls.map((r) => r[0].name);

export const getActionsDispatched = (
  mockDispatch: jest.SpyInstance,
  name: string,
) => {
  const actions = mockDispatch.mock.calls.map((r) => r[0]);

  if (name) {
    return actions.filter((r) => r.name === name);
  }

  return actions;
};

export const createWsInfo = (obj: Partial<WorkspaceInfo>): WorkspaceInfo => {
  return {
    name: 'test-ws-info',
    type: WorkspaceTypeBrowser,
    lastModified: 0,
    metadata: {},
    ...obj,
  };
};
