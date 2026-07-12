import type { browserHistoryStateEvents } from '@bangle.io/constants';
import type { Emitter } from '@bangle.io/mini-js-utils';

export type AppRouteInfo =
  | {
      route: 'ws-home';
      metadata?: Record<string, string>;
      payload: {
        wsName: string;
      };
    }
  | {
      route: 'editor';
      metadata?: Record<string, string>;
      payload: {
        wsPath: string;
      };
    }
  | {
      route: 'asset';
      metadata?: Record<string, string>;
      payload: {
        wsPath: string;
      };
    }
  | {
      route: 'not-found';
      metadata?: Record<string, string>;
      payload: {
        path?: string;
      };
    }
  | {
      route: 'settings-general';
      metadata?: Record<string, string>;
      payload: {
        returnTo?: string;
      };
    }
  | {
      route: 'settings-workspaces';
      metadata?: Record<string, string>;
      payload: {
        returnTo?: string;
      };
    }
  | {
      route: 'welcome';
      metadata?: Record<string, string>;
      payload: Record<string, never>;
    };

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
  readonly routeInfo: AppRouteInfo;

  // should merge with the location
  navigate: (
    to: AppRouteInfo,
    options?: { replace?: boolean; state?: RouterState },
  ) => void;
  // page lifecycle - https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
  readonly lifeCycle: {
    readonly current: PageLifeCycleState;
    readonly previous: PageLifeCycleState;
  };

  toUri: (routeInfo: AppRouteInfo) => string;
  fromUri: (uri: string) => AppRouteInfo;

  setUnsavedChanges: (_: boolean) => void;

  emitter: Emitter<
    | {
        event: 'event::router:route-update';
        payload: {
          routeInfo: AppRouteInfo;
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
