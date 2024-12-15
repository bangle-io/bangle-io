import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import { Emitter } from '@bangle.io/emitter';
import type {
  BaseRouter,
  PageLifeCycleState,
  RouterLocation,
  RouterState,
} from '@bangle.io/types';

export class MemoryRouterService
  extends BaseService
  implements BaseRouter<RouterState>
{
  static deps = [] as const;
  emitter: BaseRouter<RouterState>['emitter'] = new Emitter();

  private _currentPathname: RouterLocation['pathname'] = '/';
  private _currentSearch: RouterLocation['search'] = {};
  private _currentState: RouterState | null = null;
  private _basePath: string;

  constructor(
    context: BaseServiceContext,
    _dependencies: null,
    config: { basePath?: string } = {},
  ) {
    super(SERVICE_NAME.memoryRouterService, context, null);
    this._basePath = config.basePath ?? '';
  }

  async hookMount(): Promise<void> {
    this.addCleanup(() => {
      this.emitter.destroy();
    });
  }

  get pathname() {
    return this._currentPathname;
  }

  get search() {
    return this._currentSearch;
  }

  get basePath() {
    return this._basePath;
  }

  get lifeCycle(): {
    current: PageLifeCycleState;
    previous: PageLifeCycleState | undefined;
  } {
    return {
      current: 'active',
      previous: undefined,
    };
  }

  setUnsavedChanges(_: boolean): void {
    // no op for memory router
  }

  navigate(
    to: Partial<RouterLocation>,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    this._currentPathname = to.pathname || this._currentPathname;
    this._currentSearch = {
      ...this._currentSearch,
      ...to.search,
    };

    this._currentState = options?.state ?? null;

    this.emitter.emit('event::router:route-update', {
      location: {
        pathname: this._currentPathname,
        search: this._currentSearch,
      },
      state: this._currentState ?? {},
      kind: 'pushState',
    });
  }
}
