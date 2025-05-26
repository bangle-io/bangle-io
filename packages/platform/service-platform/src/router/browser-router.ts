import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME, browserHistoryStateEvents } from '@bangle.io/constants';
import { Emitter } from '@bangle.io/mini-js-utils';
import type {
  AppRouteInfo,
  BaseRouter,
  PageLifeCycleEvent,
  PageLifeCycleState,
  RouterState,
} from '@bangle.io/types';
import type { RouteStrategy } from '@bangle.io/ws-path';
import lifecycle from 'page-lifecycle';
import { navigate } from 'wouter/use-browser-location';

const UNSAVED_CHANGES_SYMBOL = Symbol('pending');

export class BrowserRouterService
  extends BaseService
  implements BaseRouter<RouterState>
{
  static readonly deps = [] as const;

  private lifecycleState: {
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  } = { current: lifecycle.state, previous: undefined };

  private _routeInfo: AppRouteInfo;
  readonly emitter: BaseRouter<RouterState>['emitter'] = new Emitter({
    paused: true,
  });

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      basePath?: string;
      isStatic?: boolean;
      strategy: RouteStrategy;
    },
  ) {
    super(SERVICE_NAME.browserRouterService, context, dependencies);
    const encoded = this.config.strategy.parseBrowserLocation(
      window.location,
      this.basePath,
    );
    this._routeInfo = this.config.strategy.decodeRouteInfo(
      encoded,
      this.basePath,
    );
  }

  private get basePath() {
    return this.config.basePath ?? '';
  }

  private get isStatic() {
    return this.config.isStatic ?? false;
  }

  get routeInfo() {
    return this._routeInfo;
  }

  get lifeCycle() {
    return this.lifecycleState;
  }

  private handleBrowserHistoryEvent = (event: Event) => {
    const encoded = this.config.strategy.parseBrowserLocation(
      window.location,
      this.basePath,
    );
    this._routeInfo = this.config.strategy.decodeRouteInfo(
      encoded,
      this.basePath,
    );

    this.emitter.emit('event::router:route-update', {
      routeInfo: this._routeInfo,
      state: history.state ?? {},
      kind: event.type as (typeof browserHistoryStateEvents)[number],
    });
  };

  private handleLifecycleStateChange = (event: PageLifeCycleEvent) => {
    this.lifecycleState = {
      current: event.newState,
      previous: event.oldState,
    };
    this.emitter.emit('event::router:page-lifecycle-state', {
      current: event.newState,
      previous: event.oldState,
    });
  };

  async hookMount(): Promise<void> {
    this.emitter.unpause();

    for (const event of browserHistoryStateEvents) {
      window.addEventListener(event, this.handleBrowserHistoryEvent);
      this.addCleanup(() => {
        window.removeEventListener(event, this.handleBrowserHistoryEvent);
      });
    }

    lifecycle.addEventListener('statechange', this.handleLifecycleStateChange);
    this.addCleanup(() => {
      lifecycle.removeEventListener(
        'statechange',
        this.handleLifecycleStateChange,
      );
    });

    this.addCleanup(() => {
      this.emitter.destroy();
    });
  }

  setUnsavedChanges(hasUnsavedChanges: boolean) {
    if (!this.mounted) {
      this.logger.warn(
        'Cannot set unsaved changes because the service is not mounted.',
      );
      return;
    }

    if (hasUnsavedChanges) {
      lifecycle.addUnsavedChanges(UNSAVED_CHANGES_SYMBOL);
    } else {
      lifecycle.removeUnsavedChanges(UNSAVED_CHANGES_SYMBOL);
    }
  }

  navigate(
    to: AppRouteInfo,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    if (this.aborted) {
      return;
    }

    const doNavigate = () => {
      const encoded = this.config.strategy.encodeRouteInfo(to, this.basePath);
      const searchPart = encoded.search ?? '';
      const hashPart = encoded.hash ?? '';
      const url = `${encoded.pathname}${searchPart}${hashPart}`;

      navigate(url, options);
    };

    if (!this.mounted) {
      this.logger.warn('Cannot navigate because the service is not mounted.');
      this.mountPromise.then(doNavigate);
    } else {
      doNavigate();
    }
  }

  toUri(routeInfo: AppRouteInfo): string {
    const encoded = this.config.strategy.encodeRouteInfo(
      routeInfo,
      this.basePath,
    );
    const searchPart = encoded.search ?? '';
    const hashPart = encoded.hash ?? '';
    return `${encoded.pathname}${searchPart}${hashPart}`;
  }

  fromUri(uri: string): AppRouteInfo {
    const url = new URL(uri, window.location.origin);
    const encoded = {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    };
    return this.config.strategy.decodeRouteInfo(encoded, this.basePath);
  }
}
