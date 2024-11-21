import type { Logger } from '@bangle.io/logger';
import type {
  BaseAppDatabase,
  BaseFileStorageProvider,
  ServiceKind,
} from '@bangle.io/types';
import { getAppErrorCause } from './throw-app-error';

export type DatabaseService = BaseAppDatabase & BaseService;
export type FileStorageService = BaseFileStorageProvider & BaseService;

/**
 * This is the base class for all the services.
 */
export abstract class BaseService {
  public readonly controller = new AbortController();
  public readonly initialized: Promise<void>;
  public initializationStatus:
    | 'not-started'
    | 'pending'
    | 'initialized'
    | 'errored' = 'not-started';

  private resolveInitialized!: () => void;
  private rejectInitialized: undefined | ((reason?: any) => void);
  protected readonly logger: Logger;

  constructor(
    public readonly name: string,
    public readonly kind: ServiceKind,
    logger: Logger,
    protected readonly dependencies: Record<string, BaseService> = {},
  ) {
    this.logger = logger.child(name);

    this.logger.debug(`Initializing service: ${this.name}`);

    this.initialized = new Promise<void>((resolve, reject) => {
      this.resolveInitialized = resolve;
      this.rejectInitialized = reject;
    });
  }

  protected getAbortSignal(): AbortSignal {
    return this.controller.signal;
  }

  async initialize(): Promise<void> {
    if (
      this.initializationStatus !== 'not-started' ||
      this.getAbortSignal().aborted
    ) {
      this.logger.debug(
        `Service initialization skipped for service: ${this.name}, status: ${this.initializationStatus}`,
      );
      return;
    }

    this.initializationStatus = 'pending';
    this.logger.info(`Initializing service: ${this.name}`);
    try {
      const depArray = Object.values(this.dependencies);
      if (depArray.length > 0) {
        for (const dep of depArray) {
          if (dep.initializationStatus === 'not-started') {
            this.logger.debug(`Triggering init dependency: for ${dep.name}`);
            dep.initialize();
          }
        }

        await Promise.all(depArray.map((dep) => dep.initialized));

        if (this.getAbortSignal().aborted) {
          return;
        }

        this.logger.debug(
          `All dependencies '${depArray
            .map((d) => d.name)
            .join(',')}' initialized for service: ${this.name}`,
        );
      }
      await this.onInitialize();

      if (this.getAbortSignal().aborted) {
        return;
      }

      this.initializationStatus = 'initialized';
      this.logger.info(`Service initialized: ${this.name}`);
      this.resolveInitialized();
    } catch (error) {
      this.initializationStatus = 'errored';
      if (error instanceof Error) {
        // prevent initialization from throwing error
        // reject the promise instead
        this.rejectInitialized?.(
          new Error(`Initialization failed for service: ${this.name}`, {
            cause: error,
          }),
        );
        return;
      }
      throw error;
    }
  }

  async dispose(): Promise<void> {
    if (this.getAbortSignal().aborted) {
      return;
    }

    // if not started prevent onDispose and other operations from running
    // kill immediately
    if (this.initializationStatus === 'not-started') {
      this.controller.abort();
      return;
    }

    await this.initialized;

    if (this.getAbortSignal().aborted) {
      return;
    }

    this.logger.info(`Disposing service: ${this.name}`);
    await this.onDispose();
    this.controller.abort();
    this.logger.info(`Service disposed: ${this.name}`);
  }

  protected async onInitialize(): Promise<void> {
    // Hook for derived classes
  }

  protected async onDispose(): Promise<void> {
    // Hook for derived classes
  }
}
