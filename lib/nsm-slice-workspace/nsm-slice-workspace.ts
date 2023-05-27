import type { StoreState } from '@bangle.io/nsm';
import {
  changeEffect,
  createMetaAction,
  createQueryState,
  createSelector,
  createSliceWithSelectors,
  Slice,
  subSelectorBuilder,
  updateState,
} from '@bangle.io/nsm';
import type { WsName, WsPath } from '@bangle.io/shared-types';
import {
  goToInvalidWorkspacePage,
  goToLandingPage,
  goToLocation,
  goToWorkspaceHome,
  locationSetWsPath,
  noOp,
  nsmPageSlice,
  wsPathToPathname,
} from '@bangle.io/slice-page';
import { sliceRefreshWorkspace } from '@bangle.io/slice-refresh-workspace';
import { weakCache } from '@bangle.io/utils';
import { fs } from '@bangle.io/workspace-info';
import {
  createWsName,
  isValidNoteWsPath,
  OpenedWsPaths,
  resolvePath2,
} from '@bangle.io/ws-path';

import { validateOpenedWsPaths } from './helpers';

type WorkspaceData = {
  wsPaths: undefined | WsPath[];
  recentlyUsedWsPaths: undefined | WsPath[];
  miniEditorWsPath: undefined | WsPath;
  popupEditorWsPath: undefined | WsPath;
};

type WorkspaceState = {
  // TODO clear workspace data when workspace is changed
  workspaceData: Record<WsName, WorkspaceData>;
};

type LocationOptions = {
  replace?: boolean;
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

const getWsPathsSet = weakCache((wsPaths: WsPath[]) => new Set(wsPaths));

const isPathInWsPaths = (wsPaths: WsPath[], path: WsPath) => {
  return getWsPathsSet(wsPaths).has(path);
};

const subSelector = subSelectorBuilder(SLICE_DEPS, SLICE_NAME, initState);

const selectWsName = subSelector((state, storeState): WsName | undefined => {
  return nsmPageSlice.resolveState(storeState).wsName;
});

const selectPrimaryWsPath = subSelector(
  (state, storeState): WsPath | undefined => {
    const wsPaths = selectWsPaths(state, storeState);
    const primaryWsPath = nsmPageSlice.resolveState(storeState).primaryWsPath;

    if (wsPaths && primaryWsPath && !isPathInWsPaths(wsPaths, primaryWsPath)) {
      return undefined;
    }

    return primaryWsPath;
  },
);

const selectSecondaryWsPath = subSelector(
  (state, storeState): WsPath | undefined => {
    const wsPaths = selectWsPaths(state, storeState);
    const secondaryWsPaths =
      nsmPageSlice.resolveState(storeState).secondaryWsPath;

    if (
      wsPaths &&
      secondaryWsPaths &&
      !isPathInWsPaths(wsPaths, secondaryWsPaths)
    ) {
      return undefined;
    }

    return secondaryWsPaths;
  },
);

const selectMiniWsPath = subSelector(
  (state, storeState): WsPath | undefined => {
    const wsName = selectWsName(state, storeState);
    const wsPaths = selectWsPaths(state, storeState);
    const miniPath = wsName
      ? state.workspaceData[wsName]?.miniEditorWsPath
      : undefined;

    if (wsPaths && miniPath && !isPathInWsPaths(wsPaths, miniPath)) {
      return undefined;
    }

    return miniPath;
  },
);

const selectPopupWsPath = subSelector(
  (state, storeState): WsPath | undefined => {
    const wsName = selectWsName(state, storeState);
    const wsPaths = selectWsPaths(state, storeState);
    const popupPath = wsName
      ? state.workspaceData[wsName]?.popupEditorWsPath
      : undefined;

    if (wsPaths && popupPath && !isPathInWsPaths(wsPaths, popupPath)) {
      return undefined;
    }

    return popupPath;
  },
);

const selectWsPaths = subSelector((state, storeState): WsPath[] | undefined => {
  const wsName = selectWsName(state, storeState);

  if (!wsName) {
    return undefined;
  }

  return state.workspaceData[wsName]?.wsPaths;
});

const selectRecentWsPaths = subSelector(
  (state, storeState): WsPath[] | undefined => {
    const wsName = selectWsName(state, storeState);

    if (!wsName) {
      return undefined;
    }

    return state.workspaceData[wsName]?.recentlyUsedWsPaths;
  },
);

export const nsmSliceWorkspace = createSliceWithSelectors(SLICE_DEPS, {
  name: SLICE_NAME,
  initState,
  selectors: {
    wsName: createSelector(
      {
        wsName: selectWsName,
      },
      (computed): WsName | undefined => computed.wsName,
    ),

    primaryWsPath: createSelector(
      {
        primaryWsPath: selectPrimaryWsPath,
      },
      (computed): WsPath | undefined => computed.primaryWsPath,
    ),

    miniWsPath: createSelector(
      {
        miniWsPath: selectMiniWsPath,
      },
      (computed): WsPath | undefined => computed.miniWsPath,
    ),

    openedWsPaths: createSelector(
      {
        primaryWsPath: selectPrimaryWsPath,
        secondaryWsPath: selectSecondaryWsPath,
        miniWsPath: selectMiniWsPath,
        popupWsPath: selectPopupWsPath,
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

    recentWsPaths: createSelector(
      {
        recentWsPaths: selectRecentWsPaths,
      },
      (computed) => {
        return computed.recentWsPaths;
      },
    ),
  },
});

Slice.registerEffectSlice(nsmSliceWorkspace, [
  changeEffect(
    'watchWorkspaceRefresh',
    {
      wsName: nsmSliceWorkspace.pick((s) => s.wsName),
      refreshWorkspace: sliceRefreshWorkspace.pick((s) => s.refreshWorkspace),
    },
    (
      { wsName, refreshWorkspace },
      dispatch,
      ref: {
        controller?: AbortController;
      },
    ) => {
      console.warn({ refreshWorkspace });
      ref.controller?.abort();

      let controller = new AbortController();
      ref.controller = controller;

      if (wsName) {
        fs.listFiles(wsName, controller.signal).then((items) => {
          dispatch(setWsPaths({ wsPaths: items, wsName }));
        });
      }
    },
  ),
]);

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

export const setMiniAndPopupPath = nsmSliceWorkspace.createAction(
  'setMiniAndPopupPath',
  ({
    mini,
    wsName,
    popup,
  }: {
    wsName: WsName;
    mini: WsPath | undefined;
    popup: WsPath | undefined;
  }) => {
    return (state) => {
      return updateWorkspaceData(state, wsName, {
        miniEditorWsPath: mini,
        popupEditorWsPath: popup,
      });
    };
  },
);

export const setMiniWsPath = nsmSliceWorkspace.createAction(
  'setMiniWsPath',
  ({ wsName, wsPath }: { wsName: WsName; wsPath: WsPath | undefined }) => {
    return (state) => {
      return updateWorkspaceData(state, wsName, {
        miniEditorWsPath: wsPath,
      });
    };
  },
);

export const setPopupWsPath = nsmSliceWorkspace.createAction(
  'setPopupWsPath',
  ({ wsName, wsPath }: { wsName: WsName; wsPath: WsPath | undefined }) => {
    return (state) => {
      return updateWorkspaceData(state, wsName, {
        popupEditorWsPath: wsPath,
      });
    };
  },
);

export const getWorkspaceData = createQueryState(
  [nsmSliceWorkspace],
  (state, wsName: WsName): WorkspaceData | undefined => {
    return nsmSliceWorkspace.resolveState(state).workspaceData[wsName];
  },
);

export const pushOpenedWsPaths = createMetaAction(
  [nsmSliceWorkspace, nsmPageSlice],
  (
    state,
    newOpened: OpenedWsPaths | ((arg: OpenedWsPaths) => OpenedWsPaths),
    opts: LocationOptions = {},
  ) => {
    const { openedWsPaths, wsName } = nsmSliceWorkspace.resolveState(state);
    const { location } = nsmPageSlice.resolveState(state);

    if (newOpened instanceof Function) {
      newOpened = newOpened(openedWsPaths);
    }

    if (newOpened.equal(openedWsPaths)) {
      return noOp(null);
    }

    const validity = validateOpenedWsPaths(newOpened);

    const proposedWsName = newOpened.getOneWsName();

    if (!validity.valid) {
      return goToInvalidWorkspacePage({
        invalidWsName: proposedWsName || createWsName('unknown-ws'),
        ...opts,
      });
    }

    if (!proposedWsName) {
      return goToLandingPage(opts);
    }

    if (!newOpened.allBelongToSameWsName(wsName)) {
      console.error('Cannot have different wsNames');

      return goToInvalidWorkspacePage({
        invalidWsName: createWsName('unknown-ws'),
        ...opts,
      });
    }

    // If primary or secondary are changing let the update happen via the  history
    // so that we can record the changes in browser history. Any other wsPaths in
    // openedWsPaths do not need to be recorded in history, so update them directly.
    if (
      openedWsPaths.primaryWsPath !== newOpened.primaryWsPath ||
      openedWsPaths.secondaryWsPath !== newOpened.secondaryWsPath
    ) {
      const newLocation = locationSetWsPath(
        location,
        proposedWsName,
        newOpened,
      );

      return goToLocation({
        location: newLocation,
        ...opts,
      });
    } else {
      return setMiniAndPopupPath({
        mini: newOpened.miniEditorWsPath2,
        popup: newOpened.popupEditorWsPath2,
        wsName: proposedWsName,
      });
    }
  },
);

export const pushPrimaryWsPath = createMetaAction(
  [nsmSliceWorkspace, nsmPageSlice],
  (state, wsPath: WsPath, opts?: LocationOptions) => {
    return pushOpenedWsPaths(
      state,
      (openedWsPath) => openedWsPath.updatePrimaryWsPath(wsPath),
      opts,
    );
  },
);

export const pushSecondaryWsPath = createMetaAction(
  [nsmSliceWorkspace, nsmPageSlice],
  (state, wsPath: WsPath, opts?: LocationOptions) => {
    return pushOpenedWsPaths(
      state,
      (openedWsPath) => openedWsPath.updateSecondaryWsPath(wsPath),
      opts,
    );
  },
);

export const openWsPathInNewTab = (wsPath: WsPath) => {
  if (typeof window !== 'undefined') {
    window.open(wsPathToPathname(wsPath));
  }
};

export const closeIfFound = createMetaAction(
  [nsmSliceWorkspace, nsmPageSlice],
  (
    state: StoreState<'bangle/page-slice' | 'nsm-slice-workspace'>,
    wsPath: WsPath,
    opts?: LocationOptions,
  ) => {
    const { openedWsPaths } = nsmSliceWorkspace.resolveState(state);

    let newOpened = openedWsPaths.closeIfFound(wsPath);

    if (!newOpened.hasSomeOpenedWsPaths()) {
      return goToWorkspaceHome({
        wsName: resolvePath2(wsPath).wsName,
        ...opts,
      });
    }

    return pushOpenedWsPaths(state, newOpened.optimizeSpace(), opts);
  },
);
