import { BaseService } from '@bangle.io/base-utils';
import type {
  BaseRouterService,
  BaseServiceCommonOptions,
  RouterState,
} from '@bangle.io/types';
import {
  isValidFileWsPath,
  pathnameToWsPath,
  resolvePath,
  wsPathToPathname,
} from '@bangle.io/ws-path';
import { atom } from 'jotai';

export class NavigationService extends BaseService {
  private routerService: BaseRouterService;

  $wsName = atom<string | undefined>(undefined);
  $wsPath = atom<string | undefined>(undefined);

  resolveAtoms() {
    return {
      wsName: this.store.get(this.$wsName),
      wsPath: this.store.get(this.$wsPath),
    };
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
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      routerService: BaseRouterService;
    },
  ) {
    super({
      ...baseOptions,
      name: 'navigation-service',
      kind: 'core',
      dependencies,
    });
    this.routerService = dependencies.routerService;
  }
  protected async onInitialize(): Promise<void> {
    this.setupRouterListener();
  }

  protected async onDispose(): Promise<void> {}

  private setupRouterListener() {
    this.syncAtoms();
    const cleanup = this.routerService.emitter.on(
      'event::router:update',
      (_event) => {
        this.syncAtoms();
      },
    );
    this.abortSignal.addEventListener('abort', () => {
      cleanup();
    });
  }

  private syncAtoms() {
    const { wsName, wsPath } = pathnameToWsPath(this.routerService.pathname);
    if (wsPath) {
      if (!isValidFileWsPath(wsPath)) {
        this.goNotFound(this.routerService.pathname);
        return;
      }
    }
    this.logger.debug(`Route changed to ${wsName} - ${wsPath}`);
    this.store.set(this.$wsName, wsName);
    this.store.set(this.$wsPath, wsPath);
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

  goNotFound(originalPath?: string) {
    this.logger.error(`goNotFound ${originalPath}`);

    let suffix = '';
    suffix += originalPath
      ? `?originalPath=${encodeURIComponent(originalPath)}`
      : '';

    this.go(`/ws-not-found${suffix}`);
  }
}
