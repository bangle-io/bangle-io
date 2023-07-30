import { isAbortError, weakCache } from '@bangle.io/mini-js-utils';
import type { InferSliceNameFromSlice, StoreState } from '@bangle.io/nsm-3';
import { cleanup, effect, operation, sliceKey } from '@bangle.io/nsm-3';
import type { WsName, WsPath } from '@bangle.io/shared-types';
import {
  goToInvalidWorkspacePage,
  goToLandingPage,
  goToLocation,
  goToWorkspaceHome,
  locationSetWsPath,
  nsmPageSlice,
  wsPathToPathname,
} from '@bangle.io/slice-page';
import { sliceRefreshWorkspace } from '@bangle.io/slice-refresh-workspace';
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

const updateWorkspaceData = (
  storeState: StoreState<any>,
  wsName: WsName,
  wsData: Partial<WorkspaceData>,
) => {
  return nsmSliceWorkspaceKey.update(storeState, (state) => {
    const existingWorkspaceData = state.workspaceData[wsName];
    const newWorkspaceData: WorkspaceData = {
      ...initWorkspaceData,
      ...existingWorkspaceData,
      ...wsData,
    };

    return {
      workspaceData: {
        ...state.workspaceData,
        [wsName]: newWorkspaceData,
      },
    };
  });
};

const SLICE_NAME = 'nsm-slice-workspace';

const getWsPathsSet = weakCache((wsPaths: WsPath[]) => new Set(wsPaths));

const selectWsName = nsmPageSlice.query(() => {
  return (storeState): WsName | undefined =>
    nsmPageSlice.get(storeState).wsName;
});

const selectPrimaryWsPath = nsmPageSlice.query(
  () =>
    (storeState): WsPath | undefined => {
      return nsmPageSlice.get(storeState).primaryWsPath;
    },
);
const selectSecondaryWsPath = nsmPageSlice.query(
  () =>
    (storeState): WsPath | undefined => {
      return nsmPageSlice.get(storeState).secondaryWsPath;
    },
);

export const nsmSliceWorkspaceKey = sliceKey([nsmPageSlice], {
  name: SLICE_NAME,
  state: initState,
});

const wsName = nsmSliceWorkspaceKey.selector((storeState) => {
  return selectWsName(storeState);
});

const primaryWsPath = nsmSliceWorkspaceKey.selector((storeState) => {
  return nsmPageSlice.get(storeState).primaryWsPath;
});

const selectMiniWsPath = nsmSliceWorkspaceKey.selector(
  (storeState): WsPath | undefined => {
    const wsName = selectWsName(storeState);

    const { workspaceData } = nsmSliceWorkspaceKey.get(storeState);
    const miniPath = wsName
      ? workspaceData[wsName]?.miniEditorWsPath
      : undefined;

    if (!miniPath) {
      return undefined;
    }

    if (!isValidNoteWsPath(miniPath)) {
      console.warn('Invalid miniPath', miniPath);

      return undefined;
    }

    return miniPath;
  },
);

const selectPopupWsPath = nsmSliceWorkspaceKey.selector(
  (storeState): WsPath | undefined => {
    const wsName = selectWsName(storeState);
    const { workspaceData } = nsmSliceWorkspaceKey.get(storeState);

    const popupPath = wsName
      ? workspaceData[wsName]?.popupEditorWsPath
      : undefined;

    if (!popupPath) {
      return undefined;
    }

    if (!isValidNoteWsPath(popupPath)) {
      console.warn('Invalid popupPath', popupPath);

      return undefined;
    }

    return popupPath;
  },
);

const openedWsPaths = nsmSliceWorkspaceKey.selector(
  (storeState) => {
    const primaryWsPath = selectPrimaryWsPath(storeState);
    const secondaryWsPath = selectSecondaryWsPath(storeState);
    const miniWsPath = selectMiniWsPath(storeState);
    const popupWsPath = selectPopupWsPath(storeState);

    return OpenedWsPaths.createEmpty()
      .updatePrimaryWsPath(primaryWsPath)
      .updateSecondaryWsPath(secondaryWsPath)
      .updateMiniEditorWsPath(miniWsPath)
      .updatePopupEditorWsPath(popupWsPath);
  },
  {
    equal: (a, b) => {
      return a.equal(b);
    },
  },
);

const selectWsPaths = nsmSliceWorkspaceKey.selector((storeState) => {
  const wsName = selectWsName(storeState);
  const { workspaceData } = nsmSliceWorkspaceKey.get(storeState);

  if (!wsName) {
    return undefined;
  }

  return workspaceData[wsName]?.wsPaths;
});

const cachedFilterNoteWsPaths = weakCache((wsPaths: WsPath[]) => {
  return wsPaths.filter((wsPath) => isValidNoteWsPath(wsPath));
});

const EMPTY_ARRAY: readonly WsPath[] = [];

const noteWsPaths = nsmSliceWorkspaceKey.selector(
  (storeState): readonly WsPath[] | undefined => {
    const wsName = selectWsName(storeState);

    const { workspaceData } = nsmSliceWorkspaceKey.get(storeState);

    if (!wsName) {
      return undefined;
    }

    const wsPaths = workspaceData[wsName]?.wsPaths;

    if (!wsPaths) {
      return EMPTY_ARRAY;
    }

    return cachedFilterNoteWsPaths(wsPaths);
  },
);

const selectRecentWsPaths = nsmSliceWorkspaceKey.selector(
  (storeState): WsPath[] | undefined => {
    const wsName = selectWsName(storeState);
    const { workspaceData } = nsmSliceWorkspaceKey.get(storeState);

    if (!wsName) {
      return undefined;
    }

    return workspaceData[wsName]?.recentlyUsedWsPaths;
  },
);

export const nsmSliceWorkspace = nsmSliceWorkspaceKey.slice({
  derivedState: {
    wsName,
    primaryWsPath,
    miniWsPath: selectMiniWsPath,
    openedWsPaths,
    wsPaths: selectWsPaths,
    noteWsPaths,
    recentWsPaths: selectRecentWsPaths,
  },
});

const watchWorkspaceRefresh = effect(function watchWorkspaceRefresh(store) {
  const { wsName } = nsmSliceWorkspace.track(store);
  void sliceRefreshWorkspace.track(store).refreshWorkspace;

  let controller = new AbortController();

  cleanup(store, () => {
    controller?.abort();
  });

  if (wsName) {
    fs.listFiles(wsName, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) {
          return;
        }
        store.dispatch(setWsPaths({ wsPaths: items, wsName }));
      })
      .catch((err) => {
        if (isAbortError(err)) {
          return;
        }
        throw err;
      });
  }
});

export const nsmWorkspaceEffects = [watchWorkspaceRefresh];

export const queryIsInWsPaths = (
  sliceState: ReturnType<typeof nsmSliceWorkspace.get>,
  wsPath: WsPath,
) => {
  return sliceState.wsPaths
    ? getWsPathsSet(sliceState.wsPaths).has(wsPath)
    : false;
};
export const setRecentlyUsedWsPaths = nsmSliceWorkspace.action(
  function setRecentlyUsedWsPaths({
    wsName,
    recentlyUsedWsPaths,
  }: {
    wsName: WsName;
    recentlyUsedWsPaths: WorkspaceData['recentlyUsedWsPaths'];
  }) {
    return nsmSliceWorkspace.tx((state) => {
      return updateWorkspaceData(state, wsName, {
        recentlyUsedWsPaths,
      });
    });
  },
);

export const setWsPaths = nsmSliceWorkspace.action(function setWsPaths({
  wsName,
  wsPaths,
}: {
  wsName: WsName;
  wsPaths: WorkspaceData['wsPaths'];
}) {
  return nsmSliceWorkspace.tx((state) => {
    return updateWorkspaceData(state, wsName, {
      wsPaths,
    });
  });
});

export const setMiniAndPopupPath = nsmSliceWorkspace.action(
  function setMiniAndPopupPath({
    mini,
    wsName,
    popup,
  }: {
    wsName: WsName;
    mini: WsPath | undefined;
    popup: WsPath | undefined;
  }) {
    return nsmSliceWorkspace.tx((state) => {
      return updateWorkspaceData(state, wsName, {
        miniEditorWsPath: mini,
        popupEditorWsPath: popup,
      });
    });
  },
);

export const setMiniWsPath = nsmSliceWorkspace.action(function setMiniWsPath({
  wsName,
  wsPath,
}: {
  wsName: WsName;
  wsPath: WsPath | undefined;
}) {
  return nsmSliceWorkspace.tx((state) => {
    return updateWorkspaceData(state, wsName, {
      miniEditorWsPath: wsPath,
    });
  });
});

export const setPopupWsPath = nsmSliceWorkspace.action(function setPopupWsPath({
  wsName,
  wsPath,
}: {
  wsName: WsName;
  wsPath: WsPath | undefined;
}) {
  return nsmSliceWorkspace.tx((state) => {
    return updateWorkspaceData(state, wsName, {
      popupEditorWsPath: wsPath,
    });
  });
});

const workspaceOperation = operation<
  | InferSliceNameFromSlice<typeof nsmPageSlice>
  | InferSliceNameFromSlice<typeof nsmSliceWorkspace>
>({
  deferred: false,
});

export const pushOpenedWsPaths = workspaceOperation(function pushOpenedWsPaths(
  newOpened: OpenedWsPaths | ((arg: OpenedWsPaths) => OpenedWsPaths),
  opts: LocationOptions = {},
) {
  return (store) => {
    const { openedWsPaths, wsName } = nsmSliceWorkspace.get(store.state);
    const { location } = nsmPageSlice.get(store.state);

    if (newOpened instanceof Function) {
      newOpened = newOpened(openedWsPaths);
    }

    if (newOpened.equal(openedWsPaths)) {
      return;
    }

    const validity = validateOpenedWsPaths(newOpened);

    const proposedWsName = newOpened.getOneWsName();

    if (!validity.valid) {
      store.dispatch(
        goToInvalidWorkspacePage({
          invalidWsName: proposedWsName || createWsName('unknown-ws'),
          ...opts,
        }),
      );

      return;
    }

    if (!proposedWsName) {
      store.dispatch(goToLandingPage(opts));

      return;
    }

    if (!newOpened.allBelongToSameWsName(wsName)) {
      console.error('Cannot have different wsNames');

      store.dispatch(
        goToInvalidWorkspacePage({
          invalidWsName: createWsName('unknown-ws'),
          ...opts,
        }),
      );

      return;
    }

    // TODO update newOpened changed a bunch of things, it is not possible to dispatch multiple actions

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

      store.dispatch(
        goToLocation({
          location: newLocation,
          ...opts,
        }),
      );

      return;
    } else {
      store.dispatch(
        setMiniAndPopupPath({
          mini: newOpened.miniEditorWsPath2,
          popup: newOpened.popupEditorWsPath2,
          wsName: proposedWsName,
        }),
      );

      return;
    }
  };
});

export const pushPrimaryWsPath = workspaceOperation(
  (wsPath: WsPath, opts?: LocationOptions) => {
    return (store) => {
      store.dispatch(
        pushOpenedWsPaths(
          (openedWsPath) => openedWsPath.updatePrimaryWsPath(wsPath),
          opts,
        ),
      );

      return;
    };
  },
);

export const pushSecondaryWsPath = workspaceOperation(
  (wsPath: WsPath, opts?: LocationOptions) => {
    return (store) => {
      store.dispatch(
        pushOpenedWsPaths(
          (openedWsPath) => openedWsPath.updateSecondaryWsPath(wsPath),
          opts,
        ),
      );

      return;
    };
  },
);

export const openWsPathInNewTab = (wsPath: WsPath) => {
  if (typeof window !== 'undefined') {
    window.open(wsPathToPathname(wsPath));
  }
};

export const closeIfFound = workspaceOperation(
  (wsPath: WsPath, opts?: LocationOptions) => {
    return (store) => {
      const { openedWsPaths } = nsmSliceWorkspace.get(store.state);
      let newOpened = openedWsPaths.closeIfFound(wsPath);

      // TODO need to dispatch two transactions here
      // 1. close primary and secondary
      // 2. close mini and popup <-- this is not happening and its a bug
      if (!newOpened.hasSomeOpenedWsPaths()) {
        store.dispatch(
          goToWorkspaceHome({
            wsName: resolvePath2(wsPath).wsName,
            ...opts,
          }),
        );

        return;
      }

      store.dispatch(pushOpenedWsPaths(newOpened.optimizeSpace(), opts));

      return;
    };
  },
);
