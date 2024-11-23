import { BaseService, type Logger } from '@bangle.io/base-utils';
import { browserHistoryStateEvents } from '@bangle.io/constants';
import { Emitter } from '@bangle.io/emitter';
import type { BaseRouter, RouterState } from '@bangle.io/types';
import { navigate } from 'wouter/use-browser-location';

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

  emitter: BaseRouter<RouterState>['emitter'] = new Emitter();

  get pathname() {
    return location.pathname;
  }

  get search() {
    return location.search;
  }

  private onBrowserHistoryEvent = (event: Event) => {
    const { pathname, search } = location;
    this.emitter.emit('event::router:update', {
      pathname,
      search,
      state: history.state,
      kind: event.type as (typeof browserHistoryStateEvents)[number],
    });
  };

  constructor(
    logger: Logger,
    private constructorOptions: { basePath?: string; isStatic?: boolean } = {},
  ) {
    super('browser-router', 'platform', logger);

    for (const event of browserHistoryStateEvents) {
      window.addEventListener(event, this.onBrowserHistoryEvent);
    }
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {
    for (const event of browserHistoryStateEvents) {
      window.removeEventListener(event, this.onBrowserHistoryEvent);
    }
    this.emitter.destroy();
  }

  navigate(
    to: string | URL,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    if (this.static) return;
    navigate(to, options);
  }
}
