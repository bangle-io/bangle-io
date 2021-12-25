import type { AppState } from '@bangle.io/create-store';

import { PageDispatchType, PageLifeCycleStates, pageSliceKey } from './common';
import { History } from './history';

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

export function setHistoryObject(history: History) {
  return (_: AppState, dispatch: PageDispatchType) => {
    dispatch({
      name: 'action::page-slice:history-set-history',
      value: { history },
    });
  };
}

export function getPageLocation() {
  return (state: AppState) => {
    const sliceState = pageSliceKey.getSliceState(state);

    return sliceState?.location;
  };
}

export function goToPathname(pathname: string) {
  return (state: AppState): void => {
    const sliceState = pageSliceKey.getSliceState(state);

    sliceState?.history.push({
      pathname: pathname,
    });
  };
}
