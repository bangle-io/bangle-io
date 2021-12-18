import { SliceKey } from '@bangle.io/create-store';

export const PAGE_BLOCK_RELOAD_ACTION_NAME = 'PAGE/BLOCK_RELOAD';

export type PAGE_BLOCK_RELOAD_ACTION_TYPE = {
  name: typeof PAGE_BLOCK_RELOAD_ACTION_NAME;
  value: boolean;
};

type PageLifeCycleStates =
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
      name: 'PAGE/UPDATE_PAGE_LIFE_CYCLE_STATE';
      value: { current?: PageLifeCycleStates; previous?: PageLifeCycleStates };
    }
  | PAGE_BLOCK_RELOAD_ACTION_TYPE;

export const pageSliceKey = new SliceKey<PageSliceStateType, PageSliceAction>(
  'page-slice',
);
