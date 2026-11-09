import {
  BaseService,
  type BaseServiceContext,
  createAppError,
} from '@bangle.io/base-utils';
import {
  isSettingsRouteInfo,
  SERVICE_NAME,
  type SettingsRoute,
} from '@bangle.io/constants';
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

  private navigationVersion = 0;

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

  $activeWsFilePath = atom<WsFilePath | undefined>((get) => {
    const routeInfo = get(this.$routeInfo);
    if (routeInfo.route !== 'editor' && routeInfo.route !== 'asset') {
      return undefined;
    }

    return WsPath.safeParseFile(routeInfo.payload.wsPath).data;
  });

  $wsName = atom<string | undefined>((get) => {
    // prefer wsFilePath over routeInfo
    const wsPath = get(this.$activeWsFilePath);
    if (wsPath) {
      return wsPath?.wsName;
    }

    // else fallback to parsing from routeInfo

    const routeInfo = get(this.$routeInfo);
    if (routeInfo.route === 'ws-home') {
      return routeInfo.payload.wsName;
    }
    if (routeInfo.route === 'editor' || routeInfo.route === 'asset') {
      return WsPath.safeParse(routeInfo.payload.wsPath).data?.wsName;
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
    this.navigationVersion += 1;
    this.store.set(this.$routeInfo, this.routerService.routeInfo);
    this.syncPageLifeCycleAtom();
    this.routerService.emitter.on(
      'event::router:route-update',
      () => {
        this.navigationVersion += 1;
        this.store.set(this.$routeInfo, this.routerService.routeInfo);
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
      activeWsFilePath: this.store.get(this.$activeWsFilePath),
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

  public go(
    to: AppRouteInfo,
    options?: { replace?: boolean; state?: RouterState },
  ) {
    this.navigationVersion += 1;
    this.routerService.navigate(to, options);
  }

  /**
   * Captures the current navigation intent so async work can avoid overwriting
   * a navigation requested or observed before that work completes.
   */
  public captureNavigationVersion(): number {
    return this.navigationVersion;
  }

  public isNavigationVersionCurrent(version: number): boolean {
    return version === this.navigationVersion;
  }

  public goWsPath(wsPath: string) {
    this.go(this.routeInfoForWsFile(wsPath));
  }

  public routeInfoForWsFile(wsPath: string): AppRouteInfo {
    const filePath = WsPath.assertFile(wsPath);
    return filePath.isMarkdown()
      ? {
          route: 'editor',
          payload: { wsPath: filePath.wsPath },
        }
      : {
          route: 'asset',
          payload: { wsPath: filePath.wsPath },
        };
  }

  public toWsFileUri(wsPath: string): string {
    return this.toUri(this.routeInfoForWsFile(wsPath));
  }

  public goWsFile(wsPath: string) {
    this.go(this.routeInfoForWsFile(wsPath));
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

  public goSettingsPage(route: SettingsRoute) {
    const returnTo = this.settingsReturnTo();
    this.go({
      route,
      payload: returnTo ? { returnTo } : {},
    });
  }

  /**
   * Opens the settings Recover page, optionally prefilling the snapshot
   * search filter (e.g. with a note's wsPath to show only its versions).
   */
  public goRecoverySettings(options: { search?: string } = {}) {
    const returnTo = this.settingsReturnTo();
    this.go({
      route: 'settings-recovery',
      payload: {
        ...(returnTo ? { returnTo } : {}),
        ...(options.search ? { search: options.search } : {}),
      },
    });
  }

  private settingsReturnTo(): string | undefined {
    const currentRoute = this.store.get(this.$routeInfo);
    return isSettingsRouteInfo(currentRoute)
      ? currentRoute.payload.returnTo
      : this.toUri(currentRoute);
  }

  private get routerService() {
    return this.dep.router;
  }

  private syncPageLifeCycleAtom() {
    const { current, previous } = this.routerService.lifeCycle;
    this.logger.debug(`page lifecycle changed from ${previous} to ${current}`);
    this.store.set(this.$lifeCycle, { current, previous });
  }
}
