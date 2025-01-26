import {
  BaseService,
  type BaseServiceContext,
  createAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  AppRouteInfo,
  BaseRouter,
  BaseRouterService,
  PageLifeCycleState,
  RouterState,
} from '@bangle.io/types';
import { type WsFilePath, WsPath } from '@bangle.io/ws-path';
import type { WritableAtom } from 'jotai';
import { atom } from 'jotai';

/**
 * Handles navigation and route state management
 */
export class NavigationService extends BaseService {
  static deps = ['router'] as const;

  $routeInfo!: WritableAtom<AppRouteInfo, [AppRouteInfo], void>;
  $lifeCycle = atom<{
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  }>({
    current: undefined,
    previous: undefined,
  });

  $wsFilePath = atom<WsFilePath | undefined>((get) => {
    const routeInfo = get(this.$routeInfo);
    if (routeInfo.route !== 'editor') {
      return undefined;
    }
    const wsPath = WsPath.safeParse(routeInfo.payload.wsPath);

    if (wsPath.validationError || !wsPath.data) {
      this.emitAppError(
        createAppError(
          'error::ws-path:invalid-ws-path',
          wsPath.validationError?.reason || 'Invalid workspace path',
          {
            invalidPath: routeInfo.payload.wsPath,
          },
        ),
      );
      return undefined;
    }

    return wsPath.data?.asFile();
  });

  $wsName = atom<string | undefined>((get) => {
    // prefer wsFilePath over routeInfo
    const wsPath = get(this.$wsFilePath);
    if (wsPath) {
      return wsPath?.wsName;
    }

    // else fallback to parsing from routeInfo
    const routeInfo = get(this.$routeInfo);
    if (routeInfo.route === 'ws-home') {
      return routeInfo.payload.wsName;
    }
    return undefined;
  });

  constructor(
    context: BaseServiceContext,
    private dep: { router: BaseRouterService },
  ) {
    super(SERVICE_NAME.navigationService, context, dep);
  }

  hookPostInstantiate(): void {
    this.$routeInfo = atom(this.routerService.routeInfo);
  }

  hookMount() {
    this.syncRouteInfoAtom();
    this.syncPageLifeCycleAtom();
    this.routerService.emitter.on(
      'event::router:route-update',
      () => {
        this.syncRouteInfoAtom();
      },
      this.abortSignal,
    );
    this.routerService.emitter.on(
      'event::router:page-lifecycle-state',
      () => {
        this.syncPageLifeCycleAtom();
      },
      this.abortSignal,
    );
  }

  public resolveAtoms() {
    return {
      wsName: this.store.get(this.$wsName),
      wsPath: this.store.get(this.$wsFilePath),
      lifeCycle: this.store.get(this.$lifeCycle),
      routeInfo: this.store.get(this.$routeInfo),
    };
  }

  public setUnsavedChanges(bool: boolean) {
    return this.routerService.setUnsavedChanges(bool);
  }

  public get emitter(): Pick<BaseRouter['emitter'], 'on'> {
    return this.routerService.emitter;
  }

  public toUri(routeInfo: AppRouteInfo): string {
    return this.routerService.toUri(routeInfo);
  }

  public fromUri(uri: string): AppRouteInfo {
    return this.routerService.fromUri(uri);
  }

  public go(
    to: AppRouteInfo,
    options?: { replace?: boolean; state?: RouterState },
  ) {
    this.routerService.navigate(to, options);
  }

  public goWsPath(wsPath: string) {
    this.go({
      route: 'editor',
      payload: { wsPath },
    });
  }

  public goWorkspace(
    wsName?: string,
    { skipIfAlreadyThere }: { skipIfAlreadyThere?: boolean } = {},
  ) {
    const targetWsName = wsName || this.store.get(this.$wsName);
    if (!targetWsName) {
      this.goNotFound();
    } else {
      if (skipIfAlreadyThere && targetWsName === this.store.get(this.$wsName)) {
        return;
      }
      this.go({
        route: 'ws-home',
        payload: { wsName: targetWsName },
      });
    }
  }

  public goNotFound(originalPath?: string) {
    this.logger.error(`goNotFound ${originalPath}`);
    this.go({
      route: 'not-found',
      payload: { path: originalPath },
    });
  }

  public goHome() {
    this.go({
      route: 'welcome',
      payload: {},
    });
  }

  private get routerService() {
    return this.dep.router;
  }

  private syncPageLifeCycleAtom() {
    const { current, previous } = this.routerService.lifeCycle;
    this.logger.debug(`page lifecycle changed from ${previous} to ${current}`);
    this.store.set(this.$lifeCycle, { current, previous });
  }

  private syncRouteInfoAtom() {
    this.store.set(this.$routeInfo, this.routerService.routeInfo);
  }
}
