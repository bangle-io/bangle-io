import { BaseService } from '@bangle.io/base-utils';
import { browserHistoryStateEvents } from '@bangle.io/constants';
import { Emitter } from '@bangle.io/emitter';
import type {
  BaseRouter,
  BaseServiceCommonOptions,
  PageLifeCycleEvent,
  PageLifeCycleState,
  RouterLocation,
  RouterState,
} from '@bangle.io/types';
import lifecycle from 'page-lifecycle';
import { navigate } from 'wouter/use-browser-location';

const pendingSymbol = Symbol('pending');

export class BrowserRouterService
  extends BaseService
  implements BaseRouter<RouterState>
{
  private _pathname: RouterLocation['pathname'] = parseBrowserPathname();
  private _search: RouterLocation['search'] = parseBrowserSearch();

  get basePath() {
    return this.constructorOptions.basePath ?? '';
  }

  get static() {
    return this.constructorOptions.isStatic ?? false;
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
    // const { pathname, search } = location;
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

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: undefined,
    private constructorOptions: { basePath?: string; isStatic?: boolean } = {},
  ) {
    super({
      ...baseOptions,
      name: 'browser-router',
      kind: 'platform',
      dependencies,
    });
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

  protected async onInitialize(): Promise<void> {
    this.emitter.unpause();
  }

  setUnsavedChanges(unsavedChanges: boolean) {
    if (this.isOk) {
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

    if (!this.isOk) {
      this.logger.warn('Cannot navigate, service is not ok');
      this.initializedPromise.then(go);
    } else {
      go();
    }
    return;
  }
}

function parseBrowserSearch(
  rawSearch: string = window.location.search,
): Record<string, string> {
  const params = new URLSearchParams(rawSearch);

  const search: Record<string, string> = {};
  for (const [key, value] of params) {
    search[key] = value;
  }

  return search;
}

function parseBrowserPathname(pathname = window.location.pathname): string {
  return decodeURI(pathname);
}

function buildURL(location: RouterLocation): string {
  const params = new URLSearchParams(location.search);

  let searchStr = params.toString();
  if (searchStr.length > 0) {
    searchStr = `?${searchStr}`;
  }

  return `${encodeURI(location.pathname)}${searchStr}`;
}
