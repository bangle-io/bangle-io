import type { AppState } from '@bangle.io/create-store';
import { locationSetWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import { PageDispatchType, PageLifeCycleState, pageSliceKey } from './common';
import { createTo } from './history/create-to';
import { historyPush, historyStateUpdate } from './history/helpers';
import { Location } from './history/types';

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

// returns a string that can be used to to navigate
// for example /ws/hello?something
export function getLocationTo() {
  return (state: AppState) => {
    const sliceState = pageSliceKey.getSliceState(state);
    if (sliceState?.location && sliceState?.history) {
      return createTo(sliceState.location, sliceState.history);
    }

    return undefined;
  };
}

export function goToLocation(
  location: Partial<Location> | string,
  { replace = false }: { replace?: boolean } = {},
) {
  return (state: AppState): void => {
    const sliceState = pageSliceKey.getSliceState(state);

    if (sliceState?.history) {
      if (typeof location === 'string') {
        sliceState.history?.navigate(location, {
          replace: replace,
        });
      } else {
        historyPush(sliceState?.history, location, { replace });
      }
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
  return (state: AppState): void => {
    const sliceState = pageSliceKey.getSliceState(state);
    if (sliceState?.history) {
      const existingLoc = {
        ...sliceState.location,
      };

      if (clearSearch) {
        existingLoc.search = '';
      }

      const location = locationSetWsPath(existingLoc, wsName, openedWsPath);

      historyPush(sliceState?.history, location, { replace });
    }
  };
}

export function saveToHistoryState(key: string, value: any) {
  return (state: AppState): void => {
    const sliceState = pageSliceKey.getSliceState(state);

    if (sliceState?.history) {
      historyStateUpdate(sliceState?.history, {
        [key]: value,
      });
    }
  };
}
