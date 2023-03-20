import {
  createSlice,
  customSerialAction,
  serialAction,
  z,
} from '@bangle.io/nsm';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { pageLifeCycleState } from './common';
import { locationSchema, locationSetWsPath } from './location-helpers';
import { pageSliceInitialState } from './page-slice';

export const nsmPageSlice = createSlice([], {
  name: '@bangle.io/page-slice',
  initState: pageSliceInitialState,
  actions: {
    blockReload: serialAction(z.boolean(), (block) => (state) => ({
      ...state,
      blockReload: block,
    })),

    setPageLifeCycleState: serialAction(
      z.object({
        current: pageLifeCycleState,
        previous: pageLifeCycleState,
      }),
      ({ current, previous }) =>
        (state) => ({
          ...state,
          lifeCycleState: {
            current,
            previous,
          },
        }),
    ),

    syncPageLocation: serialAction(locationSchema, (location) => (state) => ({
      ...state,
      location,
    })),

    goToLocation: serialAction(
      z.object({
        location: z.union([locationSchema, z.string()]),
        replace: z.boolean().optional(),
      }),
      ({ location, replace = false }) =>
        (state) => {
          if (typeof location === 'string') {
            const [pathname, search] = location.split('?');

            return {
              ...state,
              pendingNavigation: {
                location: { pathname, search },
                replaceHistory: replace,
                preserve: false,
              },
            };
          } else {
            return {
              ...state,
              pendingNavigation: {
                location,
                replaceHistory: replace,
                preserve: true,
              },
            };
          }
        },
    ),

    historyUpdateOpenedWsPaths: customSerialAction(
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

          return {
            ...sliceState,
            pendingNavigation: {
              location,
              replaceHistory: replace,
              preserve: false,
            },
          };
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
  },
  selectors: {
    getCurrentPageLifeCycle: (state) => state.lifeCycleState.current,
  },
});
