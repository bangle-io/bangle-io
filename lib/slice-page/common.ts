import {
  ApplicationStore,
  ExtractAction,
  SliceKey,
} from '@bangle.io/create-store';
import { BaseHistory } from '@bangle.io/history';
import type { Location } from '@bangle.io/ws-path';

export const PAGE_BLOCK_RELOAD_ACTION_NAME =
  'action::@bangle.io/slice-page:BLOCK_RELOAD';

export type PAGE_BLOCK_RELOAD_ACTION_TYPE = {
  name: typeof PAGE_BLOCK_RELOAD_ACTION_NAME;
  value: { block: boolean };
};

export type PageDispatchType = ApplicationStore<
  PageSliceStateType,
  PageSliceAction
>['dispatch'];

export type PageLifeCycleState =
  | 'active'
  | 'passive'
  | 'hidden'
  | 'frozen'
  | 'terminated'
  | undefined;

export interface PageSliceStateType {
  blockReload: boolean;
  history: BaseHistory | undefined;
  location: Location;
  pendingNavigation:
    | undefined
    | {
        location: Location;
        replaceHistory?: boolean;
        preserve?: boolean;
      };
  lifeCycleState: {
    current?: PageLifeCycleState;
    previous?: PageLifeCycleState;
  };
}

export type PageSliceAction =
  | PAGE_BLOCK_RELOAD_ACTION_TYPE
  | {
      name: 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE';
      value: { current?: PageLifeCycleState; previous?: PageLifeCycleState };
    }
  | {
      name: 'action::@bangle.io/slice-page:history-update-location';
      value: { location: Location };
    }
  | {
      name: 'action::@bangle.io/slice-page:history-update-pending-navigation';
      value: { pendingNavigation: PageSliceStateType['pendingNavigation'] };
    }
  | {
      name: 'action::@bangle.io/slice-page:history-set-history';
      value: {
        history: BaseHistory;
      };
    };

export const pageSliceKey = new SliceKey<PageSliceStateType, PageSliceAction>(
  'page-slice',
);

export type ExtractPageSliceAction<ActionName extends PageSliceAction['name']> =
  ExtractAction<PageSliceAction, ActionName>;
