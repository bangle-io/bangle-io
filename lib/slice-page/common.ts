import { z } from '@bangle.io/nsm-3';

import type { Location } from './location-helpers';

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
