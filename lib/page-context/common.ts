import { ApplicationStore, AppState, SliceKey } from '@bangle.io/create-store';

import type { History, HistoryState } from './history';

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
  history: HistoryState;
  location: {
    pathname: string | undefined;
    search: string | undefined;
  };
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
      name: 'action::page-slice:history-auth-error';
      value: {
        wsName: string;
      };
    }
  | {
      name: 'action::page-slice:history-ws-not-found';
      value: {
        wsName: string;
      };
    }
  | {
      name: 'action::page-slice:history-changed';
    }
  | {
      name: 'action::page-slice:history-on-invalid-path';
      value: {
        wsName: string;
        invalidPath: string;
      };
    }
  | {
      name: 'action::page-slice:history-set-history';
      value: {
        history: History;
      };
    }
  | {
      name: 'action::page-slice:history-update-opened-ws-paths';
      value: {
        openedWsPathsArray: (string | null)[];
        replace: boolean;
        wsName: string;
      };
    }
  | {
      name: 'action::page-slice:history-go-to-path';
      value: {
        pathname: string;
      };
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
