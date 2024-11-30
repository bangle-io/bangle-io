import { BaseService, isAppError } from '@bangle.io/base-utils';
import type {
  BaseRouterService,
  BaseServiceCommonOptions,
  PageLifeCycleState,
  RouterLocation,
  RouterState,
} from '@bangle.io/types';
import { buildUrlPath, parseUrlPath, resolvePath } from '@bangle.io/ws-path';
import type { WritableAtom } from 'jotai';
import { atom } from 'jotai';

export class NavigationService extends BaseService {
  private routerService: BaseRouterService;

  $lifeCycle = atom<{
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  }>({
    current: undefined,
    previous: undefined,
  });

  $location: WritableAtom<
    {
      pathname: string;
      search: Record<string, string>;
    },
    [
      {
        pathname: string;
        search: Record<string, string>;
      },
    ],
    void
  >;

  $wsPath = atom<string | undefined>((get) => {
    try {
      const result = parseUrlPath.pageEditor(get(this.$location));
      return result?.wsPath;
    } catch (error) {
      // prevent the app from crashing, but still
      // handle the validation error
      if (isAppError(error)) {
        this.emitAppError(error);
        return undefined;
      }
      throw error;
    }
  });

  $wsName = atom<string | undefined>((get) => {
    try {
      const wsPath = get(this.$wsPath);

      if (wsPath) {
        return resolvePath(wsPath)?.wsName;
      }

      const result = parseUrlPath.pageWsHome(get(this.$location));
      return result?.wsName;
    } catch (error) {
      // prevent the app from crashing, but still
      // handle the validation error
      if (isAppError(error)) {
        this.emitAppError(error);
        return undefined;
      }
      throw error;
    }
  });

  resolveAtoms() {
    return {
      wsName: this.store.get(this.$wsName),
      wsPath: this.store.get(this.$wsPath),
      lifeCycle: this.store.get(this.$lifeCycle),
      location: this.store.get(this.$location),
    };
  }

  setUnsavedChanges(bool: boolean) {
    return this.routerService.setUnsavedChanges(bool);
  }

  get pathname(): RouterLocation['pathname'] {
    return this.routerService.pathname ?? '';
  }

  get search(): RouterLocation['search'] {
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

    this.$location = atom({
      pathname: this.routerService.pathname,
      search: this.routerService.search,
    });
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
    this.store.set(this.$location, {
      pathname: this.routerService.pathname,
      search: this.routerService.search,
    });
  }

  go(
    to: Partial<RouterLocation>,
    options?: { replace?: boolean; state?: RouterState },
  ) {
    this.routerService.navigate(to, options);
  }

  goWsPath(wsPath: string) {
    const { pathname, search } = buildUrlPath.pageEditor({ wsPath });
    this.go({
      pathname,
      search,
    });
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
      this.go(buildUrlPath.pageWsHome({ wsName: targetWsName }));
    }
  }

  goNotFound(originalPath?: string) {
    this.logger.error(`goNotFound ${originalPath}`);
    this.go(buildUrlPath.pageNotFound({ path: originalPath }));
  }

  goHome() {
    this.go({
      pathname: '/',
    });
  }
}
