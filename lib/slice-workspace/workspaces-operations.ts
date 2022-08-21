import { sleep } from '@bangle.dev/utils';

import type { AppState } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import {
  goToLocation,
  pageSliceKey,
  wsNameToPathname,
} from '@bangle.io/slice-page';
import { validWsName } from '@bangle.io/ws-path';

import type { WorkspaceAppStore, WorkspaceDispatchType } from './common';
import { workspaceSliceKey } from './common';
import {
  WORKSPACE_ALREADY_EXISTS_ERROR,
  WORKSPACE_DELETED_MODIFY_ERROR,
  WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR,
  WorkspaceError,
} from './errors';
import {
  storageProviderFromExtensionRegistry,
  throwOnNotFoundWsInfo,
} from './helpers';
import { getWsName, goToWorkspaceHomeRoute } from './operations';
import {
  compareWorkspaceInfo,
  readWorkspaceInfo,
  readWorkspacesInfoReg,
  saveWorkspaceInfo,
} from './read-ws-info';

// Lists all the workspaces that have not been deleted workspaces
export function listWorkspaces() {
  return workspaceSliceKey.asyncOp(
    async (_, __, store): Promise<WorkspaceInfo[]> => {
      const workspacesInfo = await readWorkspacesInfoReg();

      // TODO WSINFO
      store.dispatch({
        name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
        value: {
          workspacesInfo: workspacesInfo,
        },
      });

      if (store.destroyed) {
        return [];
      }

      // only return the not deleted ones
      return Object.values(workspacesInfo)
        .filter((r) => !r.deleted)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  );
}

export function createWorkspace(
  wsName: string,
  type: string,
  opts: {
    [rec: string]: any;
  } = {},
) {
  return async (
    _: AppState,
    __: WorkspaceDispatchType,
    store: WorkspaceAppStore,
  ) => {
    validWsName(wsName);

    if (await readWorkspaceInfo(wsName)) {
      throw new WorkspaceError({
        message: `Cannot create "${wsName}" as it already exists`,
        code: WORKSPACE_ALREADY_EXISTS_ERROR,
      });
    }

    const storageProvider = storageProviderFromExtensionRegistry(
      type,
      extensionRegistrySliceKey.getSliceStateAsserted(store.state)
        .extensionRegistry,
    );

    if (!storageProvider) {
      throw new WorkspaceError({
        message: `Cannot create "${wsName}" as the storage provider "${type}" is not registered`,
        code: WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR,
      });
    }

    const wsMetadata =
      (await storageProvider.newWorkspaceMetadata(wsName, opts)) || {};

    const workspace: WorkspaceInfo = {
      deleted: false,
      lastModified: Date.now(),
      name: wsName,
      type,
      metadata: wsMetadata,
    };

    await saveWorkspaceInfo(workspace);

    goToLocation(wsNameToPathname(wsName))(
      store.state,
      pageSliceKey.getDispatch(store.dispatch),
    );

    await sleep(0);

    return true;
  };
}

export function deleteWorkspace(targetWsName: string) {
  return async (
    _: AppState,
    __: WorkspaceDispatchType,
    store: WorkspaceAppStore,
  ): Promise<boolean> => {
    const targetWsInfo = await readWorkspaceInfo(targetWsName);

    throwOnNotFoundWsInfo(targetWsName, targetWsInfo);

    const { wsName } = workspaceSliceKey.getSliceStateAsserted(store.state);

    if (targetWsName === wsName) {
      // goToWsNameRouteNotFoundRoute(wsName)(store.state, store.dispatch);
      goToWorkspaceHomeRoute({ replace: true })(store.state, store.dispatch);
      await Promise.resolve();
    }

    const deletedWorkspace = {
      ...targetWsInfo,
      deleted: true,
      lastModified: Date.now(),
    };

    await saveWorkspaceInfo(deletedWorkspace);

    return true;
  };
}

export function updateWorkspaceMetadata(
  wsName: string,
  metadata:
    | WorkspaceInfo['metadata']
    | ((
        existingMetadata: WorkspaceInfo['metadata'],
      ) => WorkspaceInfo['metadata']),
) {
  return workspaceSliceKey.op(async (state, dispatch) => {
    const currentWsInfo = await readWorkspaceInfo(wsName);

    throwOnNotFoundWsInfo(wsName, currentWsInfo);

    if (currentWsInfo.deleted) {
      throw new WorkspaceError({
        message: `Cannot modify a deleted workspace.`,
        code: WORKSPACE_DELETED_MODIFY_ERROR,
      });
    }

    const newMetadata =
      typeof metadata === 'function'
        ? metadata(currentWsInfo.metadata)
        : metadata;

    if (newMetadata === currentWsInfo.metadata) {
      return false;
    }

    const updatedWorkspace = {
      ...currentWsInfo,
      lastModified: Date.now(),
      metadata: {
        ...newMetadata,
      },
    };

    await saveWorkspaceInfo(updatedWorkspace);

    return true;
  });
}

export function clearCachedWorkspaceInfo() {
  return workspaceSliceKey.op((state, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-workspace:set-cached-workspace-info',
      value: {
        workspaceInfo: undefined,
      },
    });
  });
}

export function updateCachedWorkspaceInfo(wsName: string) {
  return workspaceSliceKey.asyncOp(async (_, __, store) => {
    const workspaceInfo = await readWorkspaceInfo(wsName).catch(() => {});

    const { cachedWorkspaceInfo } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    if (!workspaceInfo) {
      return false;
    }

    if (
      cachedWorkspaceInfo &&
      (await compareWorkspaceInfo(workspaceInfo, cachedWorkspaceInfo))
    ) {
      return false;
    }

    if (workspaceInfo && getWsName()(store.state) === wsName) {
      store.dispatch({
        name: 'action::@bangle.io/slice-workspace:set-cached-workspace-info',
        value: {
          workspaceInfo: workspaceInfo,
        },
      });

      return true;
    }

    return false;
  });
}
