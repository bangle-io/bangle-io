import { BaseService } from '@bangle.io/base-utils';
import type {
  BaseRouterService,
  BaseServiceCommonOptions,
  PageLifeCycleState,
  RouterState,
} from '@bangle.io/types';
import {
  isValidFileWsPath,
  pathnameToWsPath,
  wsPathToPathname,
} from '@bangle.io/ws-path';
import { atom } from 'jotai';

export class NavigationService extends BaseService {
  private routerService: BaseRouterService;

  $wsName = atom<string | undefined>(undefined);
  $wsPath = atom<string | undefined>(undefined);
  $lifeCycle = atom<{
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  }>({
    current: undefined,
    previous: undefined,
  });

  resolveAtoms() {
    return {
      wsName: this.store.get(this.$wsName),
      wsPath: this.store.get(this.$wsPath),
      lifeCycle: this.store.get(this.$lifeCycle),
    };
  }

  setUnsavedChanges(bool: boolean) {
    return this.routerService.setUnsavedChanges(bool);
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
    this.syncLocationAtoms();
    this.syncPageLifeCycleAtom();
    this.routerService.emitter.on(
      'event::router:route-update',
      (_event) => {
        this.syncLocationAtoms();
      },
      this.abortSignal,
    );
    this.routerService.emitter.on(
      'event::router:page-lifecycle-state',
      (_event) => {
        this.syncPageLifeCycleAtom();
      },
      this.abortSignal,
    );
  }

  private syncPageLifeCycleAtom() {
    const { current, previous } = this.routerService.lifeCycle;
    this.logger.debug(`page lifecycle changed from ${previous} to ${current}`);
    this.store.set(this.$lifeCycle, { current, previous });
  }

  private syncLocationAtoms() {
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
    const targetWsName = wsName || this.store.get(this.$wsName);
    if (!targetWsName) {
      this.goNotFound();
    } else {
      this.go(`/ws/${targetWsName}`);
    }
  }

  goNotFound(originalPath?: string) {
    this.logger.error(`goNotFound ${originalPath}`);

    let suffix = '';
    suffix += originalPath
      ? `?originalPath=${encodeURIComponent(originalPath)}`
      : '';

    this.go(`/ws-not-found${suffix}`);
  }

  goHome() {
    this.go('/');
  }
}
