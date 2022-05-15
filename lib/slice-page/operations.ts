import type { AppState } from '@bangle.io/create-store';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { PageDispatchType, PageLifeCycleState, pageSliceKey } from './common';
import { Location, locationSetWsPath } from './location-helpers';

export function blockReload(block: boolean) {
  return (_: AppState, dispatch: PageDispatchType) => {
    dispatch({
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      value: { block: block },
    });
  };
}

export function setPageLifeCycleState(
  current: PageLifeCycleState,
  previous: PageLifeCycleState,
) {
  return (_: AppState, dispatch: PageDispatchType) => {
    dispatch({
      name: 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: {
        current: current,
        previous: previous,
      },
    });
  };
}

// to be called when history has navigated to in store pending change
export function syncPageLocation(location: Location) {
  return (_: AppState, dispatch: PageDispatchType) => {
    dispatch({
      name: 'action::@bangle.io/slice-page:history-update-location',
      value: {
        location,
      },
    });
  };
}

// Returns true when the lifecycle changes to the one in param
// use prevState to determine the transition to
export function pageLifeCycleTransitionedTo(
  lifeCycle: PageLifeCycleState | PageLifeCycleState[],
  prevState: AppState,
) {
  return (state: AppState): boolean => {
    const current = getCurrentPageLifeCycle()(state);
    const prev = getCurrentPageLifeCycle()(prevState);

    if (current === prev) {
      return false;
    }

    if (!current) {
      return false;
    }

    if (Array.isArray(lifeCycle)) {
      return lifeCycle.includes(current);
    }

    return current === lifeCycle;
  };
}

export function getCurrentPageLifeCycle() {
  return (state: AppState) => {
    return pageSliceKey.getSliceState(state)?.lifeCycleState?.current;
  };
}

export function isPageLifeCycleOneOf(lifeCycles: PageLifeCycleState[]) {
  return (state: AppState) => {
    const lf = getCurrentPageLifeCycle()(state);

    return lf ? lifeCycles.includes(lf) : false;
  };
}

export function getPageLocation() {
  return (state: AppState) => {
    const sliceState = pageSliceKey.getSliceState(state);

    return sliceState?.location;
  };
}

export function goToLocation(
  location: Partial<Location> | string,
  { replace = false }: { replace?: boolean } = {},
) {
  return (state: AppState, dispatch: PageDispatchType): void => {
    if (typeof location === 'string') {
      const [pathname, search] = location.split('?');
      dispatch({
        name: 'action::@bangle.io/slice-page:history-update-pending-navigation',
        value: {
          pendingNavigation: {
            location: { pathname, search },
            replaceHistory: replace,
            preserve: false,
          },
        },
      });
    } else {
      dispatch({
        name: 'action::@bangle.io/slice-page:history-update-pending-navigation',
        value: {
          pendingNavigation: {
            location,
            replaceHistory: replace,
            preserve: true,
          },
        },
      });
    }
  };
}

export function historyUpdateOpenedWsPaths(
  openedWsPath: OpenedWsPaths,
  wsName: string,
  {
    replace = false,
    clearSearch = true,
  }: { replace?: boolean; clearSearch?: boolean } = {},
) {
  return (state: AppState, dispatch: PageDispatchType): void => {
    debugger;
    const sliceState = pageSliceKey.getSliceStateAsserted(state);
    const existingLoc = {
      ...sliceState.location,
    };

    if (clearSearch) {
      existingLoc.search = '';
    }

    const location = locationSetWsPath(existingLoc, wsName, openedWsPath);

    dispatch({
      name: 'action::@bangle.io/slice-page:history-update-pending-navigation',
      value: {
        pendingNavigation: {
          location,
          replaceHistory: replace,
          preserve: false,
        },
      },
    });
  };
}
