import type { AppState } from '@bangle.io/create-store';
import { locationSetWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import { PageDispatchType, PageLifeCycleStates, pageSliceKey } from './common';
import { createTo, historyPush, historyStateUpdate } from './history/helpers';
import { Location } from './history/types';

export function blockReload(block: boolean) {
  return (_: AppState, dispatch: PageDispatchType) => {
    dispatch({ name: 'action::page-slice:BLOCK_RELOAD', value: block });
  };
}

// Returns true when the lifecycle changes to the one in param
// use prevState to determine the transition to
export function pageLifeCycleTransitionedTo(
  lifeCycle: PageLifeCycleStates | PageLifeCycleStates[],
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

export function isPageLifeCycleOneOf(lifeCycles: PageLifeCycleStates[]) {
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

export function getLocationEncoded() {
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
  { replace = false }: { replace?: boolean } = {},
) {
  return (state: AppState): void => {
    const sliceState = pageSliceKey.getSliceState(state);

    if (sliceState?.history) {
      const location = locationSetWsPath(
        sliceState.location,
        wsName,
        openedWsPath,
      );
      historyPush(sliceState?.history, location, { replace });
    }
  };
}

export function saveToHistoryState(key: string, value: any) {
  return (state: AppState, dispatch: PageDispatchType): void => {
    const sliceState = pageSliceKey.getSliceState(state);

    if (sliceState?.history) {
      historyStateUpdate(sliceState?.history, {
        [key]: value,
      });
    }
  };
}
