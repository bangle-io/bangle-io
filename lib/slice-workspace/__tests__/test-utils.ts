import type { JsonArray, JsonValue } from 'type-fest';

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
import { OpenedWsPaths } from '@bangle.io/ws-path';

import type { WorkspaceSliceAction } from '../common';
import {
  JSON_SCHEMA_VERSION,
  workspaceSlice,
  workspaceSliceInitialState,
} from '../workspace-slice';
import type { WorkspaceStateKeys } from '../workspace-slice-state';
import { WorkspaceSliceState } from '../workspace-slice-state';

// Since original workspace-slice does not have serialization, this injects serialization behaviour for easier testing
// TODO: if we decide to add serialization in workspace-slice, we can remove this
export const workspaceSliceWithStateSerialization = () => {
  const wsSlice = workspaceSlice();

  if (wsSlice.spec.state) {
    wsSlice.spec.state.stateFromJSON = (_, value: any) => {
      if (!value || value.version !== JSON_SCHEMA_VERSION) {
        return workspaceSliceInitialState;
      }

      const data = value.data;

      return WorkspaceSliceState.update(workspaceSliceInitialState, {
        openedWsPaths: OpenedWsPaths.createFromArray(
          Array.isArray(data.openedWsPaths) ? data.openedWsPaths : [],
        ),
        wsName: data.wsName || undefined,
        recentlyUsedWsPaths: data.recentlyUsedWsPaths || undefined,
        wsPaths: data.wsPaths || undefined,
        refreshCounter: data.refreshCounter || 0,
        cachedWorkspaceInfo: data.cachedWorkspaceInfo || undefined,
        error: undefined,
      });
    };
    wsSlice.spec.state.stateToJSON = (val) => {
      const obj: { [K in WorkspaceStateKeys]: any } = {
        wsName: val.wsName,
        openedWsPaths: val.openedWsPaths.toArray(),
        recentlyUsedWsPaths: val.recentlyUsedWsPaths,
        wsPaths: val.wsPaths,
        refreshCounter: val.refreshCounter,
        cachedWorkspaceInfo: val.cachedWorkspaceInfo,
        error: undefined,
      };

      const result = Object.fromEntries(
        Object.entries(obj).map(([key, val]): [string, JsonValue] => {
          if (val === undefined) {
            // convert to null since JSON likes it
            return [key, null];
          }
          if (Array.isArray(val)) {
            return [key, val.map((r) => (r == null ? null : r))];
          }

          return [key, val];
        }),
      );

      return {
        version: JSON_SCHEMA_VERSION,
        data: result,
      };
    };
  }

  return wsSlice;
};
export const createState = (
  // we are adding JsonPrimitive since we this data to restore state
  data: Partial<{
    [K in WorkspaceStateKeys]: JsonPrimitive | JsonArray | undefined;
  }> = {},
  additionalSlices: Slice[] = [],
  opts?: { [key: string]: any },
) => {
  const wsSlice = workspaceSliceWithStateSerialization();

  return AppState.stateFromJSON<WorkspaceSliceState, WorkspaceSliceAction>({
    opts,
    slices: [wsSlice, pageSlice(), ...additionalSlices] as Slice[],
    json: {
      workspace: { version: JSON_SCHEMA_VERSION, data: data },
    },
    sliceFields: {
      workspace: wsSlice,
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
  data?: Parameters<typeof createState>[0],
) => {
  return createStore({ data, disableSideEffects: true });
};

export const createStore = ({
  data,
  disableSideEffects,
  additionalSlices = [],
}: {
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
