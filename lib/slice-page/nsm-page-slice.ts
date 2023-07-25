import { sliceKey } from '@bangle.io/nsm-3';
import type { WsName } from '@bangle.io/shared-types';
import type { OpenedWsPaths } from '@bangle.io/ws-path';
import {
  createWsName,
  createWsPath,
  isValidNoteWsPath,
  isValidWsName,
} from '@bangle.io/ws-path';

import type { PageLifeCycleState, PageSliceStateType } from './common';
import type { Location } from './location-helpers';
import {
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
  wsNameToPathname,
} from './location-helpers';

export const pageSliceInitialState: PageSliceStateType = {
  blockReload: false,
  pendingNavigation: undefined,
  location: {
    pathname: undefined,
    search: undefined,
  },
  lifeCycleState: {
    current: undefined,
    previous: undefined,
  },
};

type StateType = PageSliceStateType & {};
const initState: StateType = {
  ...pageSliceInitialState,
};

export const nsmPageSliceKey = sliceKey([], {
  name: 'bangle/page-slice',
  state: initState,
});

const currentPageLifeCycle = nsmPageSliceKey.selector((storeState) => {
  const { lifeCycleState } = nsmPageSliceKey.get(storeState);

  return lifeCycleState.current;
});

const wsName = nsmPageSliceKey.selector((storeState) => {
  const { location } = nsmPageSliceKey.get(storeState);
  let result = pathnameToWsName(location.pathname);

  if (!result) {
    return undefined;
  }

  if (!isValidWsName(result)) {
    console.warn('Invalid wsName', result);

    return undefined;
  }

  return createWsName(result);
});

const rawPrimaryWsPath = nsmPageSliceKey.selector(
  (storeState): string | undefined => {
    const { location } = nsmPageSliceKey.get(storeState);

    return pathnameToWsPath(location.pathname);
  },
);

const rawSecondaryWsPath = nsmPageSliceKey.selector((storeState) => {
  const { location } = nsmPageSliceKey.get(storeState);
  let result = pathnameToWsName(location.pathname);

  return result ? searchToWsPath(location.search) : undefined;
});

const primaryWsPath = nsmPageSliceKey.selector((storeState) => {
  const { location } = nsmPageSliceKey.get(storeState);
  const primary = pathnameToWsPath(location.pathname);

  if (!primary) {
    return undefined;
  }

  if (!isValidNoteWsPath(primary)) {
    console.warn('Invalid primaryWsPath', primary);

    return undefined;
  }

  return createWsPath(primary);
});

const secondaryWsPath = nsmPageSliceKey.selector((storeState) => {
  const { location } = nsmPageSliceKey.get(storeState);
  let result = pathnameToWsName(location.pathname);
  const secondary = result ? searchToWsPath(location.search) : undefined;

  if (!secondary) {
    return undefined;
  }

  if (!isValidNoteWsPath(secondary)) {
    console.warn('Invalid secondaryWsPath', secondary);

    return undefined;
  }

  return createWsPath(secondary);
});

const isInactivePage = nsmPageSliceKey.selector((storeState) => {
  const { lifeCycleState } = nsmPageSliceKey.get(storeState);
  const { current } = lifeCycleState;

  return (
    current === 'passive' || current === 'hidden' || current === 'terminated'
  );
});

export const nsmPageSlice = nsmPageSliceKey.slice({
  derivedState: {
    currentPageLifeCycle,
    wsName,
    rawPrimaryWsPath,
    rawSecondaryWsPath,
    primaryWsPath,
    secondaryWsPath,
    isInactivePage,
  },
});

export const noOp = nsmPageSlice.action(function noOp() {
  return nsmPageSlice.tx((storeState) => {
    return nsmPageSlice.update(storeState, (state) => state);
  });
});

export const blockReload = nsmPageSlice.action(function blockReload(
  block: boolean,
) {
  return nsmPageSlice.tx((storeState) =>
    nsmPageSlice.update(storeState, {
      blockReload: block,
    }),
  );
});

export const setPageLifeCycleState = nsmPageSlice.action(
  function setPageLifeCycleState({
    current,
    previous,
  }: {
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  }) {
    return nsmPageSlice.tx((storeState) => {
      return nsmPageSlice.update(storeState, {
        lifeCycleState: {
          current,
          previous,
        },
      });
    });
  },
);

export const syncPageLocation = nsmPageSlice.action(function syncPageLocation(
  location: Location,
) {
  return nsmPageSlice.tx((storeState) => {
    return nsmPageSlice.update(storeState, {
      location,
    });
  });
});

export const goToLocation = nsmPageSlice.action(function goToLocation({
  location,
  replace = false,
}: {
  location: Location | string;
  replace?: boolean;
}) {
  return nsmPageSlice.tx((storeState) => {
    if (typeof location === 'string') {
      const [pathname, search] = location.split('?');

      return nsmPageSlice.update(storeState, {
        pendingNavigation: {
          location: { pathname, search },
          replaceHistory: replace,
          preserve: false,
        },
      });
    } else {
      return nsmPageSlice.update(storeState, {
        pendingNavigation: {
          location,
          replaceHistory: replace,
          preserve: true,
        },
      });
    }
  });
});

export function goToInvalidWorkspacePage({
  invalidWsName,
  replace,
}: {
  invalidWsName: WsName;
  replace?: boolean;
}) {
  return goToLocation({
    location: `/ws-invalid-path/${encodeURIComponent(invalidWsName)}`,
    replace: false,
  });
}

export function goToLandingPage({ replace }: { replace?: boolean } = {}) {
  return goToLocation({
    location: '/landing',
    replace: replace,
  });
}

export function goToWorkspaceHome({
  wsName,
  replace,
}: {
  wsName: WsName;
  replace?: boolean;
}) {
  return goToLocation({
    location: wsNameToPathname(wsName),
    replace: replace,
  });
}

export const goToWorkspaceAuthRoute = (
  wsName: WsName,
  errorCode: string,
  openedWsPaths?: OpenedWsPaths,
) => {
  const search = new URLSearchParams([['error_code', errorCode]]);

  if (openedWsPaths) {
    savePrevOpenedWsPathsToSearch(openedWsPaths, search);
  }

  return goToLocation({
    location: {
      pathname: `/ws-auth/${encodeURIComponent(wsName)}`,
      search: search.toString(),
    },
    replace: true,
  });
};

export function goToWsNameRouteNotFoundRoute({ wsName }: { wsName: WsName }) {
  return goToLocation({
    location: `/ws-not-found/${encodeURIComponent(wsName)}`,
    replace: true,
  });
}

export function savePrevOpenedWsPathsToSearch(
  openedWsPaths: OpenedWsPaths,
  searchParams: URLSearchParams,
) {
  if (openedWsPaths.hasSomeOpenedWsPaths()) {
    searchParams.append('ws_paths', JSON.stringify(openedWsPaths.toArray()));
  }
}
