import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import { Emitter } from '@bangle.io/emitter';
import type {
  BaseRouter,
  PageLifeCycleState,
  RouterLocation,
  RouterState,
} from '@bangle.io/types';

export class MemoryRouterService
  extends BaseService2
  implements BaseRouter<RouterState>
{
  private _pathname: RouterLocation['pathname'] = '/';
  private _search: RouterLocation['search'] = {};
  private _state: RouterState | null = null;
  emitter: BaseRouter<RouterState>['emitter'] = new Emitter();

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: { basePath?: string },
  ) {
    super('memory-router', context, dependencies);
  }

  async hookMount(): Promise<void> {
    this.addCleanup(() => {
      this.emitter.destroy();
    });
  }

  get pathname() {
    return this._pathname;
  }

  get search() {
    return this._search;
  }

  get basePath() {
    return this.config.basePath ?? '';
  }

  get lifeCycle(): {
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  } {
    return {
      current: 'active',
      previous: undefined,
    };
  }

  setUnsavedChanges(_: boolean): void {}

  navigate(
    to: Partial<RouterLocation>,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    this._pathname = to.pathname || this._pathname;
    this._search = {
      ...this._search,
      ...to.search,
    };

    this._state = options?.state ?? null;

    this.emitter.emit('event::router:route-update', {
      location: { pathname: this._pathname, search: this._search },
      state: this._state ?? {},
      kind: 'pushState',
    });
  }
}
