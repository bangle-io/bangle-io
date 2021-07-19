import { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useDestroyRef } from 'utils';
import { getWsName } from 'ws-path';
import { WorkspaceInfo, WorkspaceType } from './types';
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from './workspaces-ops';

export function useWorkspaces() {
  const [workspaces, updateWorkspaces] = useState<WorkspaceInfo[]>([]);
  // history doesn't change when location changes
  // so it is a good idea to use useLocation instead of location
  const location = useLocation();
  const history = useHistory();
  const activeWsName = getWsName(location);

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
      history.push(`/ws/${wsName}`);
    },
    [history],
  );

  const importWorkspaceFromGithubCb = useCallback(
    // can pass alternate wsName in the options
    async (extensionRegistry, url, wsType, opts = {}) => {
      // const wsName = await importGithubWorkspace(
      //   extensionRegistry,
      //   url,
      //   wsType,
      //   opts.wsName,
      //   opts.token,
      // );
      // await refreshWorkspaces();
      // history.push(`/ws/${wsName}`);
    },
    [
      // history, refreshWorkspaces
    ],
  );

  const deleteWorkspaceCb = useCallback(
    async (targetWsName: string) => {
      await deleteWorkspace(targetWsName);
      if (targetWsName === activeWsName) {
        history.push(`/ws/`);
      } else {
        refreshWorkspaces();
      }
    },
    [history, activeWsName, refreshWorkspaces],
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
      history.push(newPath);
    },
    [history],
  );

  return {
    workspaces,
    createWorkspace: createWorkspaceCb,
    deleteWorkspace: deleteWorkspaceCb,
    switchWorkspace: switchWorkspaceCb,
    importWorkspaceFromGithub: importWorkspaceFromGithubCb,
  };
}
