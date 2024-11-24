import { BaseService } from '@bangle.io/base-utils';
import { Emitter } from '@bangle.io/emitter';
import type {
  BaseRouter,
  BaseServiceCommonOptions,
  RouterState,
} from '@bangle.io/types';

export class MemoryRouterService
  extends BaseService
  implements BaseRouter<RouterState>
{
  private _pathname = '/';
  private _search = '';
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
    private constructorOptions: { basePath?: string } = {},
  ) {
    super({
      ...baseOptions,
      name: 'memory-router',
      kind: 'platform',
      dependencies: {},
    });
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {
    this.emitter.destroy();
  }

  navigate(
    to: string | URL,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    const url =
      typeof to === 'string' ? new URL(to, 'http://app.bangle.io') : to;
    this._pathname = url.pathname;
    this._search = url.search;
    this._state = options?.state ?? null;

    this.emitter.emit('event::router:update', {
      pathname: this._pathname,
      search: this._search,
      state: this._state ?? {},
      kind: 'pushState',
    });
  }
}
