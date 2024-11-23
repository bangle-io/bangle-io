import type { Logger } from '@bangle.io/logger';
import type { ServiceKind } from '@bangle.io/types';

class Lifecycle {
  readonly initializedPromise: Promise<void>;
  public readonly controller = new AbortController();

  get state() {
    return this._state;
  }

  private _state: 'not-started' | 'pending' | 'initialized' | 'errored' =
    'not-started';

  get isInitialized() {
    return this.state === 'initialized';
  }

  get aborted() {
    return this.controller.signal.aborted;
  }

  private resolveInitialized!: () => void;
  private rejectInitialized: undefined | ((reason?: any) => void);

  constructor(
    private logger: Logger,
    private serviceName: string,
    private initTask: () => Promise<void>,
  ) {
    this.initializedPromise = new Promise<void>((resolve, reject) => {
      this.resolveInitialized = resolve;
      this.rejectInitialized = reject;
    });
  }

  async initialize() {
    if (this.state !== 'not-started' || this.aborted) {
      this.logger.debug(
        `Service initialization skipped for service, status: ${this.state}`,
      );
      return;
    }

    try {
      this._state = 'pending';
      this.logger.debug('Initializing service');
      await this.initTask();
      this._state = 'initialized';
      if (!this.aborted) {
        this.resolveInitialized();
      }
    } catch (error) {
      this._state = 'errored';
      this.controller.abort();
      // to keep initialize always successful
      // we reject promise so that folks downstream can handle the error
      if (error instanceof Error) {
        this.rejectInitialized?.(
          new Error(`Initialization failed for service: ${this.serviceName}`, {
            cause: error,
          }),
        );
        return;
      }
      throw error;
    }
  }
}

export abstract class BaseService<Config = void> {
  protected config!: Config;
  private isConfigSet = false;
  protected readonly logger: Logger;
  private lifecycle: Lifecycle;

  constructor(
    public readonly name: string,
    public readonly kind: ServiceKind,
    logger: Logger,
    protected readonly dependencies: Record<string, BaseService<any>> = {},
    protected readonly options: {
      needsConfig?: boolean;
    } = {},
  ) {
    this.logger = logger.child(name);
    this.logger.debug('Creating service');

    // Instantiate the Lifecycle class
    this.lifecycle = new Lifecycle(
      this.logger,
      this.name,
      this.initTask.bind(this),
    );

    this.lifecycle.controller.signal.addEventListener(
      'abort',
      () => {
        this.onDispose();
      },
      {
        once: true,
      },
    );
  }

  public initialize(): Promise<void> {
    return this.lifecycle.initialize();
  }

  public dispose() {
    this.logger.debug('Service disposed');
    this.lifecycle.controller.abort();
  }

  public get initializedPromise(): Promise<void> {
    return this.lifecycle.initializedPromise;
  }

  public get isOk(): boolean {
    return this.lifecycle.state === 'initialized' && !this.lifecycle.aborted;
  }

  public get isDisposed(): boolean {
    return this.lifecycle.aborted;
  }

  // called after the config is set
  protected hookPostConfigSet(): void {}

  // Allows setting the config before initialization
  public setInitConfig(config: Config) {
    if (!this.options.needsConfig) {
      throw new Error(
        `Config is not needed for service: ${this.name}. Remove the config from the service.`,
      );
    }
    if (this.isOk) {
      throw new Error(
        `Config can only be set before initialization for service: ${this.name}`,
      );
    }
    this.logger.debug(`Setting config for service: ${this.name}`);
    this.config = config;
    this.isConfigSet = true;

    this.hookPostConfigSet();
  }

  // The initialization task passed to the Lifecycle
  private async initTask() {
    if (!this.isConfigSet && this.options.needsConfig) {
      throw new Error(
        `Config is not set for service: ${this.name}. Call setInitConfig before initialize.`,
      );
    }

    const depArray = Object.values(this.dependencies);
    if (depArray.length > 0) {
      for (const dep of depArray) {
        if (dep.isDisposed) {
          throw new Error(
            `Dependency ${dep.name} disposed before initializing service: ${this.name}`,
          );
        }

        if (!dep.isOk) {
          this.logger.debug(`Triggering init dependency: for ${dep.name}`);
          dep.initialize();
        }
      }

      await Promise.all(depArray.map((dep) => dep.initializedPromise));

      this.logger.debug(
        `All dependencies '${depArray
          .map((d) => d.name)
          .join(',')}' initialized for service`,
      );
    }

    await this.onInitialize();
  }

  // hooks that can be implemented by the service
  protected async onInitialize(): Promise<void> {}
  protected async onDispose(): Promise<void> {}
}
