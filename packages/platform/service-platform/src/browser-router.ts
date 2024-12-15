import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
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
const UNSAVED_CHANGES_SYMBOL = Symbol('pending');

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

export class BrowserRouterService
  extends BaseService
  implements BaseRouter<RouterState>
{
  static readonly deps = [] as const;
  private _pathname: RouterLocation['pathname'] = parseBrowserPathname();
  private _search: RouterLocation['search'] = parseBrowserSearch();
  private lifecycleState: {
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  } = { current: lifecycle.state, previous: undefined };
  readonly emitter: BaseRouter<RouterState>['emitter'] = new Emitter({
    paused: true,
  });

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

  get basePath() {
    return this.config.basePath ?? '';
  }

  get isStatic() {
    return this.config.isStatic ?? false;
  }

  get pathname() {
    return this._pathname;
  }

  get search() {
    return this._search;
  }

  get lifeCycle() {
    return this.lifecycleState;
  }

  private handleBrowserHistoryEvent = (event: Event) => {
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
    to: Partial<RouterLocation>,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    if (this.aborted) {
      return;
    }

    const navigateTo = () => {
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

    if (!this.mounted) {
      this.logger.warn('Cannot navigate because the service is not mounted.');
      this.mountPromise.then(navigateTo);
    } else {
      navigateTo();
    }
  }
}
