import { BaseService, type Logger } from '@bangle.io/base-utils';
import type { BaseRouterService, RouterState } from '@bangle.io/types';
import { pathnameToWsPath, wsPathToPathname } from '@bangle.io/ws-path';

type NavigationEvent = {
  pathname: string;
  search: string;
  state: RouterState;
  kind: string;
};

export class NavigationService extends BaseService {
  private routerService: BaseRouterService;

  private _activeWsData: {
    wsName: string | undefined;
    wsPath: string | undefined;
  } = {
    wsName: undefined,
    wsPath: undefined,
  };
  get wsName(): string | undefined {
    return this._activeWsData.wsName;
  }

  get wsPath(): string | undefined {
    return this._activeWsData.wsPath;
  }

  get pathname(): string {
    return this.routerService.pathname ?? '';
  }

  get search(): string | undefined {
    return this.routerService.search;
  }

  get basePath(): string {
    return this.routerService.basePath;
  }

  get emitter(): Pick<BaseRouterService['emitter'], 'on'> {
    return this.routerService.emitter;
  }

  constructor(
    logger: Logger,
    dependencies: {
      routerService: BaseRouterService;
    },
  ) {
    super('navigation-service', 'core', logger, dependencies);
    this.routerService = dependencies.routerService;
  }

  protected async onInitialize(): Promise<void> {
    this.setupRouterListener();
  }

  private setupRouterListener() {
    this.routerService.emitter.on('event::router:update', (event) => {
      const { wsName, wsPath } = pathnameToWsPath(event.pathname);
      this._activeWsData.wsName = wsName;
      this._activeWsData.wsPath = wsPath;
      this.logger.debug(`Route changed to ${wsName} & ${wsPath}`);

      this.handleRouteChange(event);
    });
  }

  private handleRouteChange(event: NavigationEvent) {
    this.logger.info(`Route changed to ${event.pathname}`);
  }

  go(to: string | URL, options?: { replace?: boolean; state?: RouterState }) {
    this.routerService.navigate(to, options);
  }

  goWsPath(wsPath: string) {
    this.go(wsPathToPathname(wsPath));
  }

  /**
   * takes you to a given workspace home
   * if wsName is not provided, it will take you to the current workspace home
   */
  goWorkspace(wsName?: string) {
    this.go(`/ws/${wsName}`);
  }

  // goNotFound(message?: string) {}
}
