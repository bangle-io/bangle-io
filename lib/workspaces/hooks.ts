import { useCallback, useEffect, useState } from 'react';

import { useBangleStoreContext } from '@bangle.io/app-state-context';
import { getPageLocation, goToPathname } from '@bangle.io/page-context';
import { useDestroyRef } from '@bangle.io/utils';
import { getWsNameFromPathname } from '@bangle.io/ws-path';

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
  const activeWsName = getWsNameFromPathname(
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
      goToPathname(`/ws/${wsName}`)(store.state, store.dispatch);
    },
    [store],
  );

  const deleteWorkspaceCb = useCallback(
    async (targetWsName: string) => {
      await deleteWorkspace(targetWsName);
      if (targetWsName === activeWsName) {
        goToPathname(`/ws/${HELP_FS_WORKSPACE_NAME}`)(
          store.state,
          store.dispatch,
        );
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
      const newPath = '/ws/' + wsName;
      if (newTab) {
        window.open(newPath);
        return;
      }
      goToPathname(newPath)(store.state, store.dispatch);
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
