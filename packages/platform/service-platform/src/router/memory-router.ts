import {
  BaseService,
  type BaseServiceContext,
  isPlainObject,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import { Emitter } from '@bangle.io/mini-js-utils';
import type {
  AppRouteInfo,
  BaseRouter,
  PageLifeCycleState,
  RouterState,
} from '@bangle.io/types';
import { handleRouteInfo, type SearchRecord } from './common';

export class MemoryRouterService
  extends BaseService
  implements BaseRouter<RouterState>
{
  static deps = [] as const;
  emitter: BaseRouter<RouterState>['emitter'] = new Emitter();

  private _routeInfo: AppRouteInfo = {
    route: 'welcome',
    payload: {},
  };
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

  get routeInfo() {
    return this._routeInfo;
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
    to: AppRouteInfo,
    options?: { replace?: boolean; state?: RouterState },
  ): void {
    this._routeInfo = to;
    this._currentState = options?.state ?? null;

    this.emitter.emit('event::router:route-update', {
      routeInfo: this._routeInfo,
      state: this._currentState ?? {},
      kind: 'pushState',
    });
  }

  toUri(routeInfo: AppRouteInfo): string {
    return `${this._basePath}/memory/${encodeURIComponent(JSON.stringify(routeInfo))}`;
  }

  fromUri(uri: string): AppRouteInfo {
    const pathname = uri.replace(this._basePath, '');
    const match = /^\/memory\/(.+)$/.exec(pathname);
    const notFound = (): AppRouteInfo => ({
      route: 'not-found',
      payload: { path: pathname },
    });

    if (match?.[1]) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const parsed: unknown = JSON.parse(decoded);
        if (
          !isPlainObject(parsed) ||
          typeof parsed.route !== 'string' ||
          !isPlainObject(parsed.payload)
        ) {
          return notFound();
        }

        const params: SearchRecord = {};
        for (const [key, value] of Object.entries(parsed.payload)) {
          if (typeof value !== 'string') {
            return notFound();
          }
          params[key] = value;
        }

        return handleRouteInfo(parsed.route, params);
      } catch {
        return notFound();
      }
    }

    return notFound();
  }
}
