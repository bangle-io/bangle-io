import type { BaseService } from '@bangle.io/base-utils';
import type { browserHistoryStateEvents } from '@bangle.io/constants';
import type { DiscriminatedEmitter } from '@bangle.io/emitter';

export interface BaseRouter<RouterState = any> {
  readonly pathname: string | undefined;
  readonly search: string | undefined;
  readonly basePath: string;
  navigate: (
    to: string | URL,
    options?: { replace?: boolean; state?: RouterState },
  ) => void;

  emitter: DiscriminatedEmitter<{
    event: 'event::router:update';
    payload: {
      pathname: string;
      search: string;
      state: RouterState;
      kind: (typeof browserHistoryStateEvents)[number];
    };
  }>;
}
