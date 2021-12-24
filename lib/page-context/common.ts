import { ApplicationStore, AppState, SliceKey } from '@bangle.io/create-store';

export const PAGE_BLOCK_RELOAD_ACTION_NAME = 'action::page-slice:BLOCK_RELOAD';

export type PAGE_BLOCK_RELOAD_ACTION_TYPE = {
  name: typeof PAGE_BLOCK_RELOAD_ACTION_NAME;
  value: boolean;
};

export const LifeCycle = Symbol('lifecycle');

export type PageDispatchType = ApplicationStore<
  PageSliceStateType,
  PageSliceAction
>['dispatch'];

export type PageLifeCycleStates =
  | 'active'
  | 'passive'
  | 'hidden'
  | 'frozen'
  | 'terminated';

export interface PageSliceStateType {
  blockReload: boolean;
  lifeCycleState: {
    current?: PageLifeCycleStates;
    previous?: PageLifeCycleStates;
  };
}

export type PageSliceAction =
  | {
      name: 'action::page-slice:UPDATE_PAGE_LIFE_CYCLE_STATE';
      value: { current?: PageLifeCycleStates; previous?: PageLifeCycleStates };
    }
  | PAGE_BLOCK_RELOAD_ACTION_TYPE;

export const pageSliceKey = new SliceKey<PageSliceStateType, PageSliceAction>(
  'page-slice',
);

export function getPageLifeCycleObject(state: AppState):
  | {
      addUnsavedChanges: (s: Symbol) => void;
      removeUnsavedChanges: (s: Symbol) => void;
      addEventListener: (type: string, cb: (event: any) => void) => void;
      removeEventListener: (type: string, cb: (event: any) => void) => void;
    }
  | undefined {
  return pageSliceKey.getSliceState(state)?.[LifeCycle];
}
