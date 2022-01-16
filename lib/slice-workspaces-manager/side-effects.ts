import { SideEffect } from './common';
import { saveWorkspacesInfo } from './helpers';
import { listWorkspaces } from './operations';

export const refreshWorkspacesEffect: SideEffect = () => {
  return {
    deferredOnce(store) {
      listWorkspaces()(store.state, store.dispatch, store);
    },
    update(store, __, sliceState, prevSliceState) {
      const { workspaceInfos } = sliceState;
      const { workspaceInfos: prevWorkspaceInfos } = prevSliceState;

      if (workspaceInfos && workspaceInfos !== prevWorkspaceInfos) {
        saveWorkspacesInfo(store.state);
      }
    },
  };
};
