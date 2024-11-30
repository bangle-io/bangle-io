import { BaseService } from '@bangle.io/base-utils';
import { Emitter } from '@bangle.io/emitter';
import type {
  BaseRouter,
  BaseServiceCommonOptions,
  PageLifeCycleState,
  RouterLocation,
  RouterState,
} from '@bangle.io/types';

export class MemoryRouterService
  extends BaseService
  implements BaseRouter<RouterState>
{
  private _pathname: RouterLocation['pathname'] = '/';
  private _search: RouterLocation['search'] = {};
  private _state: RouterState | null = null;

  emitter: BaseRouter<RouterState>['emitter'] = new Emitter();

  get pathname() {
    return this._pathname;
  }

  get search() {
    return this._search;
  }

  get basePath() {
    return this.constructorOptions.basePath ?? '';
  }
  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: undefined,
    private constructorOptions: { basePath?: string } = {},
  ) {
    super({
      ...baseOptions,
      name: 'memory-router',
      kind: 'platform',
      dependencies,
    });
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {
    this.emitter.destroy();
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
