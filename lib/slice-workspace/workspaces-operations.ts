import { sleep } from '@bangle.dev/utils';

import { WorkspaceType } from '@bangle.io/constants';
import { AppState } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { goToLocation, pageSliceKey } from '@bangle.io/slice-page';
import { asssertNotUndefined } from '@bangle.io/utils';
import { validWsName, wsNameToPathname } from '@bangle.io/ws-path';

import {
  WorkspaceAppStore,
  WorkspaceDispatchType,
  workspaceSliceKey,
} from './common';
import {
  WORKSPACE_ALREADY_EXISTS_ERROR,
  WORKSPACE_DELETED_MODIFY_ERROR,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from './errors';
import { storageProviderFromExtensionRegistry } from './helpers';
import { goToWorkspaceHomeRoute } from './operations';
import { readWorkspacesInfoReg, saveWorkspacesInfo } from './read-ws-info';

// Lists all the workspaces that have not been deleted workspaces
export function listWorkspaces() {
  return workspaceSliceKey.asyncOp(
    async (_, __, store): Promise<WorkspaceInfo[]> => {
      const wsInfosInDb = await readWorkspacesInfoReg();

      store.dispatch({
        name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
        value: {
          workspacesInfo: wsInfosInDb,
        },
      });

      const { workspacesInfo } = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      );

      asssertNotUndefined(workspacesInfo, 'workspacesInfo cannot be undefined');

      // only return the not deleted ones
      return Object.values(workspacesInfo).filter((r) => !r.deleted);
    },
  );
}

export function createWorkspace(
  wsName: string,
  type: WorkspaceType,
  opts: {
    rootDirHandle?: any;
    githubOwner?: string;
    githubRepo?: string;
    githubBranch?: string;
  } = {},
) {
  return async (
    _: AppState,
    __: WorkspaceDispatchType,
    store: WorkspaceAppStore,
  ) => {
    validWsName(wsName);

    if (await hasWorkspace(wsName)(store.state, store.dispatch, store)) {
      throw new WorkspaceError(
        `Cannot create "${wsName}" as it already exists`,
        WORKSPACE_ALREADY_EXISTS_ERROR,
        undefined,
        undefined,
      );
    }

    const storageProvider = storageProviderFromExtensionRegistry(
      type,
      extensionRegistrySliceKey.getSliceStateAsserted(store.state)
        .extensionRegistry,
    );

    const wsMetadata =
      (await storageProvider?.newWorkspaceMetadata?.(wsName, opts)) || {};

    let workspace: WorkspaceInfo = {
      deleted: false,
      lastModified: Date.now(),
      name: wsName,
      type,
      metadata: wsMetadata,
    };

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsName]: workspace,
        },
      },
    });

    await saveWorkspacesInfo(store.state);

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
    const targetWsInfo = await getWorkspaceInfo(targetWsName)(store.state);

    const { wsName } = workspaceSliceKey.getSliceStateAsserted(store.state);

    if (targetWsName === wsName) {
      goToWorkspaceHomeRoute({ replace: true })(store.state, store.dispatch);
      await Promise.resolve();
    }

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [targetWsName]: {
            ...targetWsInfo,
            deleted: true,
            lastModified: Date.now(),
          },
        },
      },
    });

    await saveWorkspacesInfo(store.state);

    return true;
  };
}

export function updateWorkspaceMetadata(
  wsName: string,
  metadata: { [key: string]: any },
) {
  return workspaceSliceKey.op(async (state, dispatch) => {
    const currentWsInfo = getWorkspaceInfoSync(wsName)(state);

    if (currentWsInfo.deleted) {
      throw new WorkspaceError(
        `Cannot modify a deleted workspace.`,
        WORKSPACE_DELETED_MODIFY_ERROR,
      );
    }

    dispatch({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsName]: {
            ...currentWsInfo,
            lastModified: Date.now(),
            metadata: {
              ...metadata,
            },
          },
        },
      },
    });

    // TODO save ws info
    // await saveWorkspacesInfo(store.state);
  });
}

// Will check in store for wsInfo, if not found will then check indexed-db asyncronously
// if still not found, will throw an error if workspace is not found
export function getWorkspaceInfo(wsName: string) {
  return async (state: AppState): Promise<WorkspaceInfo> => {
    let wsInfo =
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo?.[wsName];

    if (!wsInfo) {
      const wsInfosInDb = await readWorkspacesInfoReg();

      wsInfo = wsInfosInDb[wsName];

      if (!wsInfo) {
        throw new WorkspaceError(
          `Workspace ${wsName} not found`,
          WORKSPACE_NOT_FOUND_ERROR,
          `Cannot find the workspace ${wsName}`,
          undefined,
        );
      }
    }

    return wsInfo;
  };
}

// Syncronously checks if wsInfo exists in state and throws an error
// if workspace is not found. If not sure, use `getWorkspaceInfo` instead.
export function getWorkspaceInfoSync(wsName: string) {
  return workspaceSliceKey.queryOp((state): WorkspaceInfo => {
    let wsInfo =
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo?.[wsName];

    if (!wsInfo) {
      throw new WorkspaceError(
        `Workspace ${wsName} not found`,
        WORKSPACE_NOT_FOUND_ERROR,
        `Cannot find the workspace ${wsName}`,
        undefined,
      );
    }

    return wsInfo;
  });
}

// checks if a workspace that has not been deleted exists
export function hasWorkspace(wsName: string) {
  return workspaceSliceKey.asyncOp(async (_, __, store) => {
    const workspaces = await listWorkspaces()(
      store.state,
      store.dispatch,
      store,
    );

    const workspaceInfo = workspaces.find(({ name }) => name === wsName);

    return Boolean(workspaceInfo);
  });
}
