import { BaseService } from '@bangle.io/base-utils';
import { browserHistoryStateEvents } from '@bangle.io/constants';
import { Emitter } from '@bangle.io/emitter';
import type {
  BaseRouter,
  BaseServiceCommonOptions,
  PageLifeCycleEvent,
  PageLifeCycleState,
  RouterState,
} from '@bangle.io/types';
import lifecycle from 'page-lifecycle';
import { navigate } from 'wouter/use-browser-location';

const pendingSymbol = Symbol('pending');

export class BrowserRouterService
  extends BaseService
  implements BaseRouter<RouterState>
{
  get basePath() {
    return this.constructorOptions.basePath ?? '';
  }

  get static() {
    return this.constructorOptions.isStatic ?? false;
  }

  emitter: BaseRouter<RouterState>['emitter'] = new Emitter({ paused: true });

  get pathname() {
    return location.pathname;
  }

  get search() {
    return location.search;
  }

  private lifeCycleState: {
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  } = { current: lifecycle.state, previous: undefined };

  get lifeCycle() {
    return this.lifeCycleState;
  }

  private onBrowserHistoryEvent = (event: Event) => {
    const { pathname, search } = location;
    this.emitter.emit('event::router:route-update', {
      pathname,
      search,
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
    to: string | URL,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    if (!this.isOk) {
      this.logger.warn('Cannot navigate, service is not ok');
      return;
    }
    if (this.static) return;
    navigate(to, options);
  }
}
