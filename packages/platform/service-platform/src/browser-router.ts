import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME, browserHistoryStateEvents } from '@bangle.io/constants';
import { Emitter } from '@bangle.io/emitter';
import type {
  BaseRouter,
  PageLifeCycleEvent,
  PageLifeCycleState,
  RouterLocation,
  RouterState,
} from '@bangle.io/types';
import { buildURL } from '@bangle.io/ws-path';
import lifecycle from 'page-lifecycle';
import { navigate } from 'wouter/use-browser-location';

type SearchRecord = Record<string, string | null>;
const pendingSymbol = Symbol('pending');

export class BrowserRouterService
  extends BaseService2
  implements BaseRouter<RouterState>
{
  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      basePath?: string;
      isStatic?: boolean;
    },
  ) {
    super(SERVICE_NAME.browserRouterService, context, dependencies);
  }

  private _pathname: RouterLocation['pathname'] = parseBrowserPathname();
  private _search: RouterLocation['search'] = parseBrowserSearch();

  get basePath() {
    return this.config.basePath ?? '';
  }

  get static() {
    return this.config.isStatic ?? false;
  }

  emitter: BaseRouter<RouterState>['emitter'] = new Emitter({ paused: true });

  get pathname() {
    return this._pathname;
  }

  get search() {
    return this._search;
  }

  private lifeCycleState: {
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  } = { current: lifecycle.state, previous: undefined };

  get lifeCycle() {
    return this.lifeCycleState;
  }

  private onBrowserHistoryEvent = (event: Event) => {
    this._search = parseBrowserSearch();
    this._pathname = parseBrowserPathname();
    this.emitter.emit('event::router:route-update', {
      location: {
        pathname: this._pathname,
        search: this._search,
      },
      state: history.state,
      kind: event.type as (typeof browserHistoryStateEvents)[number],
    });
  };

  private lifeCycleEmit = (event: PageLifeCycleEvent) => {
    this.lifeCycleState = {
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
      window.addEventListener(event, this.onBrowserHistoryEvent);
      this.addCleanup(() => {
        window.removeEventListener(event, this.onBrowserHistoryEvent);
      });
    }

    lifecycle.addEventListener('statechange', this.lifeCycleEmit);
    this.addCleanup(() => {
      lifecycle.removeEventListener('statechange', this.lifeCycleEmit);
    });

    this.addCleanup(() => {
      this.emitter.destroy();
    });
  }

  setUnsavedChanges(unsavedChanges: boolean) {
    if (this.mounted) {
      if (unsavedChanges) {
        lifecycle.addUnsavedChanges(pendingSymbol);
      } else {
        lifecycle.removeUnsavedChanges(pendingSymbol);
      }
    } else {
      this.logger.warn('Cannot setUnsavedChanges, service is not ok');
    }
  }

  navigate(
    to: Partial<RouterLocation>,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    const go = () => {
      navigate(
        buildURL({
          pathname: to.pathname ?? this._pathname,
          search: {
            ...this._search,
            ...to.search,
          },
        }),
        options,
      );
    };
    if (this.aborted) {
      return;
    }
    if (!this.mounted) {
      this.logger.warn('Cannot navigate, service is not ok');
      this.mountPromise.then(go);
    } else {
      go();
    }
    return;
  }
}

function parseBrowserSearch(
  rawSearch: string = window.location.search,
): SearchRecord {
  const params = new URLSearchParams(rawSearch);

  const search: SearchRecord = {};
  for (const [key, value] of params) {
    search[key] = value;
  }

  return search;
}

function parseBrowserPathname(pathname = window.location.pathname): string {
  return decodeURI(pathname);
}
