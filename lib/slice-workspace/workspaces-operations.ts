import { sleep } from '@bangle.dev/utils';

import type { AppState } from '@bangle.io/create-store';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import {
  goToLocation,
  pageSliceKey,
  wsNameToPathname,
} from '@bangle.io/slice-page';
import {
  getStorageProvider,
  storageProviderSliceKey,
} from '@bangle.io/slice-storage-provider';
import {
  compareWorkspaceInfo,
  readAllWorkspacesInfo,
  readWorkspaceInfo,
  saveWorkspaceInfo,
} from '@bangle.io/workspace-info';
import { validWsName } from '@bangle.io/ws-path';

import type { WorkspaceAppStore, WorkspaceDispatchType } from './common';
import { workspaceSliceKey } from './common';
import { WorkspaceError, WorkspaceErrorCode } from './errors';
import {
  getWsName,
  goToWorkspaceHomeRoute,
  goToWsNameRouteNotFoundRoute,
} from './operations';

export function handleWorkspaceError(error: Error) {
  return workspaceSliceKey.op((state, dispatch): boolean => {
    if (error instanceof WorkspaceError) {
      const wsName = getWsName()(state);

      switch (error.code) {
        case WorkspaceErrorCode.WORKSPACE_NOT_FOUND_ERROR: {
          if (wsName) {
            goToWsNameRouteNotFoundRoute(wsName)(state, dispatch);
          } else {
            // TODO have a unknown workspace error route
            goToWorkspaceHomeRoute()(state, dispatch);
          }

          return true;
        }

        case WorkspaceErrorCode.NOTE_FORMAT_PROVIDER_NOT_FOUND_ERROR: {
          return false;
        }

        case WorkspaceErrorCode.WORKSPACE_ALREADY_EXISTS_ERROR: {
          return false;
        }

        case WorkspaceErrorCode.WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR: {
          return false;
        }

        default: {
          let val: never = error.code;

          return false;
        }
      }
    }

    return false;
  });
}

// Lists all the workspaces that have not been deleted workspaces
export function listWorkspaces() {
  return workspaceSliceKey.asyncOp(
    async (_, __, store): Promise<WorkspaceInfo[]> => {
      const workspacesInfo = await readAllWorkspacesInfo();

      if (store.destroyed) {
        return [];
      }

      return workspacesInfo;
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

    const wsInfo = await readWorkspaceInfo(wsName);

    if (wsInfo) {
      throw new WorkspaceError({
        message: `Cannot create "${wsName}" as it already exists`,
        code: WorkspaceErrorCode.WORKSPACE_ALREADY_EXISTS_ERROR,
      });
    }

    const storageProvider = storageProviderSliceKey.callQueryOp(
      store.state,
      getStorageProvider(wsName, type),
    );

    WorkspaceError.assertStorageProviderDefined(storageProvider, type);

    const wsMetadata =
      (await storageProvider.newWorkspaceMetadata(wsName, opts)) || {};

    const workspaceInfo: WorkspaceInfo = {
      deleted: false,
      lastModified: Date.now(),
      name: wsName,
      type,
      metadata: wsMetadata,
    };

    await saveWorkspaceInfo(
      wsName,
      (w) => ({
        ...w,
        // if there was a previously deleted workspace with the same name,
        // overwrite it
        ...workspaceInfo,
      }),
      workspaceInfo,
    );

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

    WorkspaceError.assertWsInfoDefined(targetWsName, targetWsInfo);

    const { wsName } = workspaceSliceKey.getSliceStateAsserted(store.state);

    if (targetWsName === wsName) {
      goToWorkspaceHomeRoute({ replace: true })(store.state, store.dispatch);
      await Promise.resolve();
    }

    await saveWorkspaceInfo(
      targetWsName,
      (existing) => ({
        ...existing,
        deleted: true,
      }),
      targetWsInfo,
    );

    return true;
  };
}

export function updateCachedWorkspaceInfo(wsName: string) {
  return workspaceSliceKey.asyncOp(async (_, __, store) => {
    const workspaceInfo = await readWorkspaceInfo(wsName).catch(() => {});

    if (!workspaceInfo) {
      return false;
    }

    const { cachedWorkspaceInfo } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

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
