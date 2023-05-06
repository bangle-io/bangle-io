import type { ValidStoreState } from '@bangle.io/nsm';
import {
  createSelector,
  createSliceWithSelectors,
  subSelectorBuilder,
  updateState,
} from '@bangle.io/nsm';
import type { WsName } from '@bangle.io/shared-types';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

type WorkspaceData = {
  wsPaths: undefined | string[];
  recentlyUsedWsPaths: undefined | string[];
  miniEditorWsPath: undefined | string;
  popupEditorWsPath: undefined | string;
};

type WorkspaceState = {
  workspaceData: Record<WsName, WorkspaceData>;
};

const initWorkspaceData: WorkspaceData = {
  wsPaths: undefined,
  recentlyUsedWsPaths: undefined,
  miniEditorWsPath: undefined,
  popupEditorWsPath: undefined,
};

const initState: WorkspaceState = {
  workspaceData: {},
};

const updateObj = updateState(initState);

const updateWorkspaceData = (
  state: WorkspaceState,
  wsName: WsName,
  wsData: Partial<WorkspaceData>,
) => {
  const existingWorkspaceData = state.workspaceData[wsName];
  const newWorkspaceData: WorkspaceData = {
    ...initWorkspaceData,
    ...existingWorkspaceData,
    ...wsData,
  };

  return updateObj(state, {
    workspaceData: {
      ...state.workspaceData,
      [wsName]: newWorkspaceData,
    },
  });
};

const SLICE_DEPS = [nsmPageSlice];
const SLICE_NAME = 'nsm-slice-workspace';

const subSelector = subSelectorBuilder(SLICE_DEPS, SLICE_NAME, initState);

const selectWsName = subSelector((state, storeState): WsName | undefined => {
  return nsmPageSlice.resolveState(storeState).wsName;
});

const selectPrimaryWsPath = subSelector((state, storeState) => {
  return nsmPageSlice.resolveState(storeState).primaryWsPath;
});

const selectSecondaryWsPath = subSelector((state, storeState) => {
  return nsmPageSlice.resolveState(storeState).secondaryWsPath;
});

const selectWsPaths = subSelector((state, storeState): string[] | undefined => {
  const wsName = selectWsName(state, storeState);

  if (!wsName) {
    return undefined;
  }

  return state.workspaceData[wsName]?.wsPaths;
});

export const nsmSliceWorkspace = createSliceWithSelectors(SLICE_DEPS, {
  name: SLICE_NAME,
  initState,
  selectors: {
    wsName: createSelector(
      {
        wsName: selectWsName,
      },
      (computed): string | undefined => computed.wsName,
    ),

    openedWsPaths: createSelector(
      {
        primaryWsPath: selectPrimaryWsPath,
        secondaryWsPath: selectSecondaryWsPath,
        miniWsPath: (state, storeState) => {
          const wsName = selectWsName(state, storeState);

          return wsName
            ? state.workspaceData[wsName]?.miniEditorWsPath
            : undefined;
        },
        popupWsPath: (state, storeState) => {
          const wsName = selectWsName(state, storeState);

          return wsName
            ? state.workspaceData[wsName]?.popupEditorWsPath
            : undefined;
        },
      },
      (computed) => {
        return OpenedWsPaths.createEmpty()
          .updatePrimaryWsPath(computed.primaryWsPath)
          .updateSecondaryWsPath(computed.secondaryWsPath)
          .updateMiniEditorWsPath(computed.miniWsPath)
          .updatePopupEditorWsPath(computed.popupWsPath);
      },
    ),

    wsPaths: createSelector(
      {
        wsPaths: selectWsPaths,
      },
      (computed) => computed.wsPaths,
    ),

    noteWsPaths: createSelector(
      {
        wsPaths: selectWsPaths,
      },
      (computed) => {
        return computed.wsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
      },
    ),
  },
});

export const setRecentlyUsedWsPaths = nsmSliceWorkspace.createAction(
  'setRecentlyUsedWsPaths',
  ({
    wsName,
    recentlyUsedWsPaths,
  }: {
    wsName: WsName;
    recentlyUsedWsPaths: WorkspaceData['recentlyUsedWsPaths'];
  }) => {
    return (state) => {
      return updateWorkspaceData(state, wsName, {
        recentlyUsedWsPaths,
      });
    };
  },
);

export const setWsPaths = nsmSliceWorkspace.createAction(
  'setWsPaths',
  ({
    wsName,
    wsPaths,
  }: {
    wsName: WsName;
    wsPaths: WorkspaceData['wsPaths'];
  }) => {
    return (state) => {
      return updateWorkspaceData(state, wsName, {
        wsPaths,
      });
    };
  },
);

export const setMiniWsPath = nsmSliceWorkspace.createAction(
  'setMiniWsPath',
  ({ wsName, wsPath }: { wsName: WsName; wsPath: string | undefined }) => {
    return (state) => {
      return updateWorkspaceData(state, wsName, {
        miniEditorWsPath: wsPath,
      });
    };
  },
);

export const setPopupWsPath = nsmSliceWorkspace.createAction(
  'setPopupWsPath',
  ({ wsName, wsPath }: { wsName: WsName; wsPath: string | undefined }) => {
    return (state) => {
      return updateWorkspaceData(state, wsName, {
        popupEditorWsPath: wsPath,
      });
    };
  },
);

export const getWorkspaceData = <TStateSlices extends string>(
  state: ValidStoreState<TStateSlices, typeof SLICE_NAME>,
  wsName: WsName,
): WorkspaceData | undefined => {
  return nsmSliceWorkspace.resolveState(state).workspaceData[wsName];
};
