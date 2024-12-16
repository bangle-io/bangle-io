import type { Logger } from '@bangle.io/logger';
import { isAbortError } from '@bangle.io/mini-js-utils';
import type { Service, ServiceContext } from '@bangle.io/poor-mans-di';
import type {
  BaseError,
  BaseServiceCommonOptions,
  Store,
} from '@bangle.io/types';
import { getAppErrorCause } from './throw-app-error';

export type BaseServiceContext = {
  ctx: BaseServiceCommonOptions;
  serviceContext: ServiceContext;
};

export abstract class BaseService implements Service<BaseServiceCommonOptions> {
  hookPostInstantiate?() {}

  // called after hookPostInstantiate and  asynchronously after all dependencies have mounted
  abstract hookMount(): void | Promise<void>;

  abortSignal: AbortSignal;
  logger: Logger;

  get aborted() {
    return this.abortSignal.aborted;
  }
  get mounted() {
    return this._mounted;
  }

  private _mountPromise!: Promise<void>;

  private _mounted = false;

  get mountPromise() {
    return this._mountPromise;
  }

  protected get store(): Store {
    return this.__context.ctx.store;
  }

  constructor(
    public name: string,
    private __context: BaseServiceContext,
    private __dependencies: Record<string, Service<any>> | null,
  ) {
    this.logger = __context.ctx.logger.child(this.name);
    this.logger.debug('Creating service');
    this.abortSignal = __context.serviceContext.abortSignal;

    this.abortSignal.addEventListener('abort', () => {
      this.logger.debug('Aborting service');
      this._mounted = false;
    });
  }

  addCleanup(...callbacks: Array<() => void>): void {
    for (const cb of callbacks) {
      this.abortSignal.addEventListener(
        'abort',
        () => {
          cb();
        },
        {
          once: true,
        },
      );
    }
  }

  postInstantiate() {
    this.hookPostInstantiate?.();
  }

  mount() {
    if (this._mountPromise) {
      return this._mountPromise;
    }

    const dep = this.__dependencies ?? {};

    this._mountPromise = Promise.all(
      Object.values(dep)
        .map((dep) => dep.mount?.())
        .filter((x) => !!x),
    ).then(() => {
      this.logger.debug('Mounting service');
      this._mounted = true;
      return this.hookMount();
    });

    return this._mountPromise;
  }

  protected emitAppError(error: BaseError): void {
    this.logger.debug('Emitting app error');
    queueMicrotask(() => {
      this.__context.ctx.emitAppError(error);
    });
  }

  protected async atomHandleAppError<T>(
    promise: Promise<T>,
    fallbackValue: NoInfer<T>,
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      if (isAbortError(error)) {
        return fallbackValue;
      }
      if (error instanceof Error) {
        const appError = getAppErrorCause(error as BaseError);
        if (appError) {
          this.emitAppError(error);
          return fallbackValue;
        }
      }
      throw error;
    }
  }
}
