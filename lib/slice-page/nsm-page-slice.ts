import {
  createSelector,
  createSliceWithSelectors,
  serialAction,
  updateState,
  z,
} from '@bangle.io/nsm';
import type { WsName, WsPath } from '@bangle.io/shared-types';
import type { OpenedWsPaths } from '@bangle.io/ws-path';
import { createWsName, createWsPath } from '@bangle.io/ws-path';

import type { PageSliceStateType } from './common';
import { pageLifeCycleState } from './common';
import {
  locationSchema,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
  wsNameToPathname,
} from './location-helpers';
import { pageSliceInitialState } from './page-slice';

type StateType = PageSliceStateType & {};
const initState: StateType = {
  ...pageSliceInitialState,
};

const selectiveUpdate = updateState(initState, (state, prevState) => {
  return state;
});

export const nsmPageSlice = createSliceWithSelectors([], {
  name: 'bangle/page-slice',
  initState: initState,

  selectors: {
    currentPageLifeCycle: createSelector(
      { current: (state) => state.lifeCycleState.current },
      (computed) => computed.current,
    ),

    wsName: createSelector(
      { location: (state) => state.location },
      (computed): WsName | undefined => {
        let result = pathnameToWsName(computed.location.pathname);

        if (result) {
          return createWsName(result);
        }

        return undefined;
      },
    ),

    primaryWsPath: createSelector(
      { location: (state) => state.location },
      (computed): WsPath | undefined => {
        const primary = pathnameToWsPath(computed.location.pathname);

        return primary ? createWsPath(primary) : undefined;
      },
    ),

    secondaryWsPath: createSelector(
      { location: (state) => state.location },
      (computed): WsPath | undefined => {
        let result = pathnameToWsName(computed.location.pathname);

        const secondary = result
          ? searchToWsPath(computed.location.search)
          : undefined;

        return secondary ? createWsPath(secondary) : undefined;
      },
    ),

    isInactivePage: createSelector(
      {
        current: (state) => state.lifeCycleState.current,
      },
      (computed) => {
        return (
          computed.current === 'passive' ||
          computed.current === 'hidden' ||
          computed.current === 'terminated'
        );
      },
    ),
  },
});
export const noOp = nsmPageSlice.createAction(
  'noOp',
  serialAction(z.null(), () => {
    return (state) => {
      return state;
    };
  }),
);

export const blockReload = nsmPageSlice.createAction(
  'blockReload',
  serialAction(z.boolean(), (block) => {
    return (state) =>
      selectiveUpdate(state, {
        blockReload: block,
      });
  }),
);

export const setPageLifeCycleState = nsmPageSlice.createAction(
  'setPageLifeCycleState',
  serialAction(
    z.object({
      current: pageLifeCycleState,
      previous: pageLifeCycleState,
    }),
    ({ current, previous }) => {
      return (state) =>
        selectiveUpdate(state, {
          lifeCycleState: {
            current,
            previous,
          },
        });
    },
  ),
);

export const syncPageLocation = nsmPageSlice.createAction(
  'syncPageLocation',
  serialAction(locationSchema, (location) => (state) => {
    return selectiveUpdate(state, {
      location,
    });
  }),
);

export const goToLocation = nsmPageSlice.createAction(
  'goToLocation',
  serialAction(
    z.object({
      location: z.union([locationSchema, z.string()]),
      replace: z.boolean().optional(),
    }),
    ({ location, replace = false }) =>
      (state) => {
        if (typeof location === 'string') {
          const [pathname, search] = location.split('?');

          return selectiveUpdate(state, {
            pendingNavigation: {
              location: { pathname, search },
              replaceHistory: replace,
              preserve: false,
            },
          });
        } else {
          return selectiveUpdate(state, {
            pendingNavigation: {
              location,
              replaceHistory: replace,
              preserve: true,
            },
          });
        }
      },
  ),
);

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
