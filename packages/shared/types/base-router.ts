import type { browserHistoryStateEvents } from '@bangle.io/constants';
import type { Emitter } from '@bangle.io/emitter';

export type PageLifeCycleEvent = {
  newState: PageLifeCycleState;
  oldState: PageLifeCycleState;
};

export type PageLifeCycleState =
  | 'active'
  | 'passive'
  | 'hidden'
  | 'frozen'
  | 'terminated'
  | undefined;

export type RouterLocation = {
  pathname: string;
  search: Record<string, string>;
};
export interface BaseRouter<RouterState = any> {
  readonly pathname: string;
  readonly search: Record<string, string>;

  readonly basePath: string;
  // should merge with the location
  navigate: (
    to: Partial<RouterLocation>,
    options?: { replace?: boolean; state?: RouterState },
  ) => void;
  // page lifecycle - https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
  readonly lifeCycle: {
    readonly current: PageLifeCycleState;
    readonly previous: PageLifeCycleState;
  };

  setUnsavedChanges: (_: boolean) => void;

  emitter: Emitter<
    | {
        event: 'event::router:route-update';
        payload: {
          location: RouterLocation;
          state: RouterState;
          kind: (typeof browserHistoryStateEvents)[number];
        };
      }
    | {
        event: 'event::router:page-lifecycle-state';
        payload: {
          current: PageLifeCycleState;
          previous: PageLifeCycleState;
        };
      }
  >;
}
