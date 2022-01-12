import * as idb from 'idb-keyval';

import { saveToHistoryState } from '@bangle.io/slice-page';

import {
  SideEffect,
  workspacesSliceKey,
  WorkspacesSliceState,
  WorkspaceType,
} from './common';
import { saveWorkspacesInfo } from './helpers';
import { listWorkspaces } from './operations';

export const refreshWorkspacesEffect: SideEffect = (store) => {
  listWorkspaces()(store.state, store.dispatch, store);

  return {
    update(store, __, sliceState, prevSliceState) {
      const { workspaceInfos } = sliceState;
      const { workspaceInfos: prevWorkspaceInfos } = prevSliceState;

      if (workspaceInfos && workspaceInfos !== prevWorkspaceInfos) {
        saveWorkspacesInfo(store.state);
      }
    },
  };
};

// Persist rootDirectory handle in the browser history to
// prevent release of the authorized native browser FS permission on reload
export const saveWorkspaceInfoEffect: SideEffect = () => {
  let lastWorkspaceInfos: WorkspacesSliceState['workspaceInfos'] | undefined =
    undefined;

  return {
    deferredUpdate(store) {
      const { workspaceInfos } = workspacesSliceKey.getSliceStateAsserted(
        store.state,
      );

      if (workspaceInfos && lastWorkspaceInfos !== workspaceInfos) {
        const result = Object.values(workspaceInfos)
          .filter((r) => !r.deleted)
          .map((r) => {
            if (r.type === WorkspaceType['nativefs']) {
              return r?.metadata?.rootDirHandle;
            }
            return undefined;
          })
          .filter((r) => r);

        saveToHistoryState('workspacesRootDir', result)(store.state);
        lastWorkspaceInfos = workspaceInfos;
      }
    },
  };
};
