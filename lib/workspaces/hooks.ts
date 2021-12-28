import { useCallback, useEffect, useState } from 'react';

import { useBangleStoreContext } from '@bangle.io/app-state-context';
import { getPageLocation, goToLocation } from '@bangle.io/page-context';
import { useDestroyRef } from '@bangle.io/utils';
import { pathnameToWsName, wsNameToPathname } from '@bangle.io/ws-path';

import { HELP_FS_WORKSPACE_NAME, WorkspaceInfo, WorkspaceType } from './types';
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from './workspaces-ops';

export function useWorkspaces() {
  const store = useBangleStoreContext();
  const [workspaces, updateWorkspaces] = useState<WorkspaceInfo[]>([]);
  // We cannot use workspace-context for getting wsName
  // as it will cause cyclic dependency
  const activeWsName = pathnameToWsName(
    getPageLocation()(store.state)?.pathname,
  );

  const destroyedRef = useDestroyRef();

  const refreshWorkspaces = useCallback(() => {
    listWorkspaces().then((workspaces) => {
      if (!destroyedRef.current) {
        updateWorkspaces(workspaces);
      }
    });
  }, [destroyedRef]);

  const createWorkspaceCb = useCallback(
    async (wsName: string, type: WorkspaceType, opts: any = {}) => {
      await createWorkspace(wsName, type, opts);
      // To allow doing things to the workspace before we change
      // the history
      if (opts.beforeHistoryChange) {
        await opts.beforeHistoryChange();
      }
      goToLocation(wsNameToPathname(wsName))(store.state);
    },
    [store],
  );

  const deleteWorkspaceCb = useCallback(
    async (targetWsName: string) => {
      await deleteWorkspace(targetWsName);
      if (targetWsName === activeWsName) {
        goToLocation(wsNameToPathname(HELP_FS_WORKSPACE_NAME))(store.state);
      } else {
        refreshWorkspaces();
      }
    },
    [store, activeWsName, refreshWorkspaces],
  );

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const switchWorkspaceCb = useCallback(
    async (wsName: string, newTab?: boolean) => {
      if (newTab) {
        window.open(wsNameToPathname(wsName));
        return;
      }
      goToLocation(wsNameToPathname(wsName))(store.state);
    },
    [store],
  );

  return {
    workspaces,
    createWorkspace: createWorkspaceCb,
    deleteWorkspace: deleteWorkspaceCb,
    switchWorkspace: switchWorkspaceCb,
  };
}
