import type { ApplicationStore, ExtractAction } from '@bangle.io/create-store';
import { SliceKey } from '@bangle.io/create-store';
import { z } from '@bangle.io/nsm';

import type { Location } from './location-helpers';

export const PAGE_BLOCK_RELOAD_ACTION_NAME =
  'action::@bangle.io/slice-page:BLOCK_RELOAD';

export type PageDispatchType = ApplicationStore<
  PageSliceStateType,
  PageSliceAction
>['dispatch'];

export const pageLifeCycleState = z.union([
  z.literal('active'),
  z.literal('passive'),
  z.literal('hidden'),
  z.literal('frozen'),
  z.literal('terminated'),
  z.undefined(),
]);

export type PageLifeCycleState = z.infer<typeof pageLifeCycleState>;

export interface PageSliceStateType {
  blockReload: boolean;
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
  | {
      name: typeof PAGE_BLOCK_RELOAD_ACTION_NAME;
      value: { block: boolean };
    }
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
    };

export const pageSliceKey = new SliceKey<PageSliceStateType, PageSliceAction>(
  'page-slice',
);

export type ExtractPageSliceAction<ActionName extends PageSliceAction['name']> =
  ExtractAction<PageSliceAction, ActionName>;
