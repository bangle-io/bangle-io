import {
  ApplicationStore,
  AppState,
  ExtractAction,
  SliceKey,
} from '@bangle.io/create-store';

import { BaseHistory } from './history/base-history';
import { Location } from './history/types';

export const PAGE_BLOCK_RELOAD_ACTION_NAME = 'action::page-slice:BLOCK_RELOAD';

export type PAGE_BLOCK_RELOAD_ACTION_TYPE = {
  name: typeof PAGE_BLOCK_RELOAD_ACTION_NAME;
  value: { block: boolean };
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
  history: BaseHistory | undefined;
  location: Location;
  historyChangedCounter: number;
  lifeCycleState: {
    current?: PageLifeCycleStates;
    previous?: PageLifeCycleStates;
  };
}

export type PageSliceAction =
  | PAGE_BLOCK_RELOAD_ACTION_TYPE
  | {
      name: 'action::page-slice:UPDATE_PAGE_LIFE_CYCLE_STATE';
      value: { current?: PageLifeCycleStates; previous?: PageLifeCycleStates };
    }
  | {
      name: 'action::page-slice:history-set-history';
      value: {
        history: BaseHistory;
      };
    }
  | {
      name: 'action::page-slice:history-update-location';
      value: { location: Location };
    };

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

export type ExtractPageSliceAction<ActionName extends PageSliceAction['name']> =
  ExtractAction<PageSliceAction, ActionName>;
