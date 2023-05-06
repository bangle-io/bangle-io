import {
  createSelector,
  createSliceWithSelectors,
  customSerialAction,
  serialAction,
  updateState,
  z,
} from '@bangle.io/nsm';
import type { WsName } from '@bangle.io/shared-types';
import { createWsName, OpenedWsPaths } from '@bangle.io/ws-path';

import type { PageSliceStateType } from './common';
import { pageLifeCycleState } from './common';
import {
  locationSchema,
  locationSetWsPath,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
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
      (computed) => {
        return pathnameToWsPath(computed.location.pathname);
      },
    ),

    secondaryWsPath: createSelector(
      { location: (state) => state.location },
      (computed) => {
        return searchToWsPath(computed.location.search);
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

export const historyUpdateOpenedWsPaths = nsmPageSlice.createAction(
  'historyUpdateOpenedWsPaths',
  customSerialAction(
    ({
        openedWsPath,
        wsName,
        replace = false,
        clearSearch = true,
      }: {
        openedWsPath: OpenedWsPaths;
        wsName: string;
        replace?: boolean;
        clearSearch?: boolean;
      }) =>
      (sliceState) => {
        const existingLoc = {
          ...sliceState.location,
        };

        if (clearSearch) {
          existingLoc.search = '';
        }

        const location = locationSetWsPath(existingLoc, wsName, openedWsPath);

        return selectiveUpdate(sliceState, {
          pendingNavigation: {
            location,
            replaceHistory: replace,
            preserve: false,
          },
        });
      },
    {
      schema: z.object({
        openedWsPath: z.array(z.string().or(z.null())),
        wsName: z.string(),
        replace: z.boolean().optional(),
        clearSearch: z.boolean().optional(),
      }),
      serialize: ({ openedWsPath, ...rest }) => {
        return {
          ...rest,
          openedWsPath: openedWsPath.toArray(),
        };
      },
      deserialize: (obj) => {
        return {
          ...obj,
          openedWsPath: OpenedWsPaths.createFromArray(obj.openedWsPath),
        };
      },
    },
  ),
);
