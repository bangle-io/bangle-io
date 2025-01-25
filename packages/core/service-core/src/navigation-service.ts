import {
  BaseService,
  type BaseServiceContext,
  createAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseRouterService,
  PageLifeCycleState,
  RouterLocation,
  RouterState,
} from '@bangle.io/types';
import {
  type WsFilePath,
  WsPath,
  buildUrlPath,
  parseUrlPath,
} from '@bangle.io/ws-path';
import type { WritableAtom } from 'jotai';
import { atom } from 'jotai';

/**
 * Handles navigation and route state management
 */
export class NavigationService extends BaseService {
  static deps = ['router'] as const;

  $location!: WritableAtom<RouterLocation, [RouterLocation], void>;
  $lifeCycle = atom<{
    current: PageLifeCycleState;
    previous: PageLifeCycleState;
  }>({
    current: undefined,
    previous: undefined,
  });

  $wsFilePath = atom<WsFilePath | undefined>((get) => {
    const result = parseUrlPath.pageEditor(get(this.$location));
    if (!result?.wsPath) {
      return undefined;
    }
    const wsPath = WsPath.safeParse(result?.wsPath);

    if (wsPath.validationError || !wsPath.data) {
      this.emitAppError(
        createAppError(
          'error::ws-path:invalid-ws-path',
          wsPath.validationError?.reason || 'Invalid workspace path',
          {
            invalidPath: result?.wsPath,
          },
        ),
      );
      return undefined;
    }

    return wsPath.data?.asFile();
  });

  $wsName = atom<string | undefined>((get) => {
    // prefer wsFilePath over location
    const wsPath = get(this.$wsFilePath);
    if (wsPath) {
      return wsPath?.wsName;
    }

    // else false back to parsing from location, as not everything is a file
    const result = parseUrlPath.pageWsHome(get(this.$location));
    return result?.wsName;
  });

  constructor(
    context: BaseServiceContext,
    private dep: { router: BaseRouterService },
  ) {
    super(SERVICE_NAME.navigationService, context, dep);
  }

  hookPostInstantiate(): void {
    this.$location = atom({
      pathname: this.routerService.pathname,
      search: this.routerService.search,
    });
  }

  hookMount() {
    this.syncLocationAtoms();
    this.syncPageLifeCycleAtom();
    this.routerService.emitter.on(
      'event::router:route-update',
      () => {
        this.syncLocationAtoms();
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
      location: this.store.get(this.$location),
    };
  }

  public setUnsavedChanges(bool: boolean) {
    return this.routerService.setUnsavedChanges(bool);
  }

  public get pathname(): RouterLocation['pathname'] {
    return this.routerService.pathname ?? '';
  }

  public get search(): RouterLocation['search'] {
    return this.routerService.search;
  }

  public get basePath(): string {
    return this.routerService.basePath;
  }

  public get emitter(): Pick<BaseRouterService['emitter'], 'on'> {
    return this.routerService.emitter;
  }

  public go(
    to: Partial<RouterLocation>,
    options?: { clearPath?: boolean; replace?: boolean; state?: RouterState },
  ) {
    this.routerService.navigate(to, options);
  }

  public goWsPath(wsPath: string) {
    const { pathname, search } = buildUrlPath.pageEditor({ wsPath });
    this.go({ pathname, search });
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
      this.go(buildUrlPath.pageWsHome({ wsName: targetWsName }));
    }
  }

  public goNotFound(originalPath?: string) {
    this.logger.error(`goNotFound ${originalPath}`);
    this.go(buildUrlPath.pageNotFound({ path: originalPath }));
  }

  public goHome() {
    this.go({
      pathname: '/',
      search: { p: null },
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

  private syncLocationAtoms() {
    this.store.set(this.$location, {
      pathname: this.routerService.pathname,
      search: this.routerService.search,
    });
  }
}
