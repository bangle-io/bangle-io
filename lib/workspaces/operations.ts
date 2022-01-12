import { AppState } from '@bangle.io/create-store';
import { getPageLocation, goToLocation } from '@bangle.io/page-context';
import { asssertNotUndefined } from '@bangle.io/utils';
import {
  pathnameToWsName,
  validWsName,
  wsNameToPathname,
} from '@bangle.io/ws-path';

import {
  HELP_FS_WORKSPACE_NAME,
  WorkspaceInfo,
  WorkspacesAppStore,
  WorkspacesDispatchType,
  workspacesSliceKey,
  WorkspaceType,
} from './common';
import {
  WORKSPACE_ALREADY_EXISTS_ERROR,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from './errors';
import { readWorkspacesInfoReg, saveWorkspacesInfo } from './helpers';

// Lists all the workspaces that have not been deleted workspaces
export function listWorkspaces() {
  return async (
    _: AppState,
    __: WorkspacesDispatchType,
    store: WorkspacesAppStore,
  ): Promise<WorkspaceInfo[]> => {
    const wsInfosInDb = await readWorkspacesInfoReg();

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: wsInfosInDb,
      },
    });

    const { workspaceInfos } = workspacesSliceKey.getSliceStateAsserted(
      store.state,
    );

    asssertNotUndefined(workspaceInfos, 'workspaceInfos cannot be undefined');

    // only return the not deleted ones
    return Object.values(workspaceInfos).filter((r) => !r.deleted);
  };
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
    __: WorkspacesDispatchType,
    store: WorkspacesAppStore,
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

    let workspace: WorkspaceInfo;

    switch (type) {
      case WorkspaceType.browser: {
        workspace = {
          deleted: false,
          lastModified: Date.now(),
          name: wsName,
          type,
          metadata: {},
        };

        break;
      }

      case 'github-read-fs': {
        workspace = {
          deleted: false,
          lastModified: Date.now(),
          name: wsName,
          type,
          metadata: {
            githubOwner: opts.githubOwner,
            githubRepo: opts.githubRepo,
            githubBranch: opts.githubBranch,
          },
        };
        break;
      }

      case WorkspaceType.nativefs: {
        const { rootDirHandle } = opts;
        if (!rootDirHandle) {
          throw new Error(
            `rootDirHandle is necessary for creating ${type} of workspaces`,
          );
        }

        workspace = {
          deleted: false,
          lastModified: Date.now(),
          name: wsName,
          type,
          metadata: {
            rootDirHandle,
          },
        };
        break;
      }

      default: {
        throw new Error('Unknown workspace type ' + type);
      }
    }

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: {
          [wsName]: workspace,
        },
      },
    });

    await saveWorkspacesInfo(store.state);

    goToLocation(wsNameToPathname(wsName))(store.state);

    return true;
  };
}

export function deleteWorkspace(targetWsName: string) {
  return async (
    _: AppState,
    __: WorkspacesDispatchType,
    store: WorkspacesAppStore,
  ): Promise<boolean> => {
    const targetWsInfo = await getWorkspaceInfo(targetWsName)(
      store.state,
      store.dispatch,
      store,
    );

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: {
          [targetWsName]: {
            ...targetWsInfo,
            deleted: true,
            lastModified: Date.now(),
          },
        },
      },
    });

    await saveWorkspacesInfo(store.state);

    // We cannot use workspace-context for getting wsName
    // as it will cause cyclic dependency
    const activeWsName = pathnameToWsName(
      getPageLocation()(store.state)?.pathname,
    );

    if (targetWsName === activeWsName) {
      goToLocation(wsNameToPathname(HELP_FS_WORKSPACE_NAME))(store.state);
    }

    return true;
  };
}

// Will throw an error if workspace is not found
export function getWorkspaceInfo(wsName: string) {
  return async (
    state: AppState,
    dispatch: WorkspacesDispatchType,
    store: WorkspacesAppStore,
  ): Promise<WorkspaceInfo> => {
    const workspaces = await listWorkspaces()(
      store.state,
      store.dispatch,
      store,
    );

    const workspaceInfo = workspaces.find(({ name }) => name === wsName);

    if (!workspaceInfo) {
      throw new WorkspaceError(
        `Workspace ${wsName} not found`,
        WORKSPACE_NOT_FOUND_ERROR,
        `Cannot find the workspace ${wsName}`,
        undefined,
      );
    }

    return workspaceInfo;
  };
}

// checks if a workspace that has not been deleted exists
export function hasWorkspace(wsName: string) {
  return async (_, __, store: WorkspacesAppStore) => {
    const workspaces = await listWorkspaces()(
      store.state,
      store.dispatch,
      store,
    );

    const workspaceInfo = workspaces.find(({ name }) => name === wsName);

    return Boolean(workspaceInfo);
  };
}
