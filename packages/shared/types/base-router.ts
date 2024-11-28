import type { browserHistoryStateEvents } from '@bangle.io/constants';
import type { DiscriminatedEmitter } from '@bangle.io/emitter';

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

export interface BaseRouter<RouterState = any> {
  readonly pathname: string;
  readonly search: string | undefined;
  readonly basePath: string;
  navigate: (
    to: string | URL,
    options?: { replace?: boolean; state?: RouterState },
  ) => void;
  // page lifecycle - https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
  readonly lifeCycle: {
    readonly current: PageLifeCycleState;
    readonly previous: PageLifeCycleState;
  };

  setUnsavedChanges: (_: boolean) => void;

  emitter: DiscriminatedEmitter<
    | {
        event: 'event::router:route-update';
        payload: {
          pathname: string;
          search: string;
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
