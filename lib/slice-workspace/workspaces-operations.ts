import { sleep } from '@bangle.dev/utils';

import { WorkspaceType } from '@bangle.io/constants';
import { AppState } from '@bangle.io/create-store';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import {
  getPageLocation,
  goToLocation,
  pageSliceKey,
} from '@bangle.io/slice-page';
import { asssertNotUndefined } from '@bangle.io/utils';
import {
  pathnameToWsName,
  validWsName,
  wsNameToPathname,
} from '@bangle.io/ws-path';

import {
  WorkspaceAppStore,
  WorkspaceDispatchType,
  workspaceSliceKey,
} from './common';
import { goToWorkspaceHomeRoute } from './operations';
import {
  WORKSPACE_ALREADY_EXISTS_ERROR,
  WORKSPACE_DELETED_MODIFY_ERROR,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from './workspaces/errors';
import {
  readWorkspacesInfoReg,
  saveWorkspacesInfo,
} from './workspaces/read-ws-info';

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

    // We cannot use workspace-context for getting wsName
    // as it will cause cyclic dependency
    const activeWsName = pathnameToWsName(
      getPageLocation()(store.state)?.pathname,
    );

    if (targetWsName === activeWsName) {
      goToWorkspaceHomeRoute({ replace: true })(store.state, store.dispatch);
    }

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
  return async (
    state: AppState,
    // store: WorkspaceAppStore,
  ): Promise<WorkspaceInfo> => {
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
  return (state: AppState): WorkspaceInfo => {
    let wsInfo =
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo?.[wsName];

    if (!wsInfo) {
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

// checks if a workspace that has not been deleted exists
export function hasWorkspace(wsName: string) {
  return async (_, __, store: WorkspaceAppStore) => {
    const workspaces = await listWorkspaces()(
      store.state,
      store.dispatch,
      store,
    );

    const workspaceInfo = workspaces.find(({ name }) => name === wsName);

    return Boolean(workspaceInfo);
  };
}
