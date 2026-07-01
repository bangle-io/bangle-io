import { type DependencyDefinition, recursiveInstantiate } from './recurse';

const STATIC_FIELD = 'deps';

export type Constructor<T, Arguments extends unknown[] = any[]> = new (
  ...arguments_: Arguments
) => T;

export type ServiceContext = {
  abortSignal: AbortSignal;
};

export interface Service<_TContext> {
  mountPromise?: Promise<void>;
  mount?: () => Promise<void>;
  postInstantiate?(): void;
}

export type ServiceStartupPhase = 'instantiate' | 'postInstantiate' | 'mount';

export class ServiceStartupError extends Error {
  name = 'ServiceStartupError';

  constructor(
    public readonly slotId: string,
    public readonly phase: ServiceStartupPhase,
    public readonly cause: unknown,
  ) {
    super(
      `Service "${slotId}" failed during ${phase}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }
}

export type ServiceConstructor<
  TContext,
  TDeps extends Record<string, Service<any>> = Record<string, Service<any>>,
  TConfig = any,
> = Constructor<
  Service<TContext>,
  [{ ctx: TContext; serviceContext: ServiceContext }, TDeps, TConfig]
>;

export type ServiceToConstructor<T extends Service<any>> = new (
  param: T extends Service<infer C>
    ? { ctx: C; serviceContext: ServiceContext }
    : never,
  dependencies: Record<string, Service<unknown>>,
  config: any,
) => T;

export type ConstructorToInstance<T extends Record<string, Constructor<any>>> =
  {
    [K in keyof T]: InstanceType<T[K]>;
  };

export type ContainerDescription = {
  dependencyOrder: string[];
  failedSlot?: {
    message: string;
    phase: ServiceStartupPhase;
    slotId: string;
  };
  mountedCount: number;
  services: Array<{
    dependencies: string[];
    instantiated: boolean;
    mounted: boolean;
    slotId: string;
  }>;
};

type ConstructorConfig<TClass extends Constructor<any, any[]>> =
  TClass extends Constructor<any, [any, any, infer TConfig, ...any[]]>
    ? TConfig
    : never;

/**
 * The Container class manages the instantiation and configuration of services.
 * Public API:
 *  - use(name, replacement)
 *  - setConfig(serviceClass, config)
 *  - instantiateAll()
 *  - mountAll()
 */
export class Container<
  TContext,
  TContainer extends Record<string, ServiceConstructor<TContext, any>>,
> {
  private registeredServices: Record<string, ServiceConstructor<TContext>> = {};
  private serviceConfigs = new Map<
    ServiceConstructor<TContext>,
    unknown | (() => unknown)
  >();
  private instantiatedServices:
    | undefined
    | Record<string, { key: string; instance: Service<TContext> }>;
  private context: TContext;
  private dependencyOrder: string[] = [];
  private failedSlot:
    | undefined
    | { message: string; phase: ServiceStartupPhase; slotId: string };
  private hasInstantiatedAll = false;

  constructor(
    private options: {
      abortSignal: AbortSignal;
      context: TContext;
    },
    serviceMap: TContainer,
  ) {
    this.context = options.context;
    this.initializeRegisteredServices(serviceMap);
  }

  /**
   * Replace a service definition before instantiation.
   */
  use<T extends keyof TContainer, K extends Constructor<any>>(
    name: T,
    replacement: InstanceType<K> extends InstanceType<TContainer[T]>
      ? K
      : never,
  ): void {
    if (this.instantiatedServices) {
      throw new Error(
        'Cannot call use() after instantiateAll() has been called.',
      );
    }
    this.registeredServices[name as string] = replacement;
  }

  /**
   * Set configuration for a service class.
   */
  setConfig<TClass extends Constructor<any, any[]>>(
    serviceClass: TClass,
    config: ConstructorConfig<TClass> | (() => ConstructorConfig<TClass>),
  ): void {
    if (this.instantiatedServices) {
      throw new Error(
        'Cannot call setConfig() after instantiateAll() has been called.',
      );
    }

    this.serviceConfigs.set(serviceClass, config);
  }

  /**
   * Instantiates all services, respecting dependencies and calling postInstantiate if defined.
   */
  instantiateAll(
    focus?: (keyof TContainer & string) | (keyof TContainer & string)[],
  ): ConstructorToInstance<TContainer> {
    if (this.instantiatedServices) {
      throw new Error('instantiateAll() can only be called once.');
    }

    const dependencyList = this.createDependencyList();
    let instantiatedServicesMap: Record<string, Service<TContext>>;
    try {
      instantiatedServicesMap = recursiveInstantiate(dependencyList, focus);
    } catch (error) {
      if (error instanceof ServiceStartupError) {
        throw error;
      }
      throw this.startupError('container', 'instantiate', error);
    }
    this.dependencyOrder = Object.keys(instantiatedServicesMap);

    this.instantiatedServices = {};
    for (const [key, instance] of Object.entries(instantiatedServicesMap)) {
      this.instantiatedServices[key] = { key, instance };
    }

    for (const service of Object.values(this.instantiatedServices)) {
      if (service.instance.postInstantiate) {
        try {
          service.instance.postInstantiate();
        } catch (error) {
          throw this.startupError(service.key, 'postInstantiate', error);
        }
      }
    }

    this.hasInstantiatedAll = true;

    // If in focus mode, return a proxy that validates access
    if (focus) {
      const instantiatedKeys = Object.keys(instantiatedServicesMap);
      return new Proxy(
        instantiatedServicesMap as ConstructorToInstance<TContainer>,
        {
          get(target, prop) {
            if (typeof prop === 'string' && !instantiatedKeys.includes(prop)) {
              throw new Error(
                `Cannot access service "${String(prop)}" in focus mode. Only these services are instantiated: ${instantiatedKeys.join(
                  ', ',
                )}`,
              );
            }
            return target[prop as keyof typeof target];
          },
        },
      );
    }

    return instantiatedServicesMap as ConstructorToInstance<TContainer>;
  }

  /**
   * Mount all services that have a mount method. Must be called after instantiateAll.
   */
  async mountAll(): Promise<void> {
    if (!this.hasInstantiatedAll || !this.instantiatedServices) {
      throw new Error('instantiateAll() must be called before mountAll().');
    }

    const mountPromises = Object.values(this.instantiatedServices).map(
      async (service) => {
        if (typeof service.instance.mount === 'function') {
          try {
            await service.instance.mount();
          } catch (error) {
            throw this.startupError(service.key, 'mount', error);
          }
        }
      },
    );

    await Promise.all(mountPromises);
  }

  describe(): ContainerDescription {
    const services = Object.keys(this.registeredServices).map((slotId) => {
      const ServiceClass = this.registeredServices[slotId];
      const instance = this.instantiatedServices?.[slotId]?.instance;
      return {
        slotId,
        dependencies: (
          (ServiceClass as { deps?: readonly string[] })[STATIC_FIELD] ?? []
        )
          .slice()
          .sort(),
        instantiated: instance !== undefined,
        mounted:
          instance !== undefined &&
          (instance as { mounted?: unknown }).mounted === true,
      };
    });

    return {
      dependencyOrder: this.dependencyOrder.slice(),
      failedSlot: this.failedSlot ? { ...this.failedSlot } : undefined,
      mountedCount: services.filter((service) => service.mounted).length,
      services,
    };
  }

  // ---------------- Private Methods ----------------

  /**
   * Initialize the registeredServices map from the provided serviceMap.
   */
  private initializeRegisteredServices(serviceMap: TContainer): void {
    for (const key in serviceMap) {
      const val = serviceMap[key];
      if (typeof val === 'function') {
        this.registeredServices[key] = val;
      } else {
        // Placeholder with a dummy class
        this.registeredServices[key] = class UnimplementedService {
          constructor() {
            throw new Error(
              `Service "${key}" is only defined as an interface placeholder and has not been replaced with a real class.`,
            );
          }
        };
      }
    }
  }

  /**
   * Creates a list of dependency definitions suitable for recursiveInstantiate.
   */
  private createDependencyList(): DependencyDefinition<Service<any>>[] {
    return Object.keys(this.registeredServices).map((name) => {
      const ServiceClass = this.registeredServices[name];
      if (!ServiceClass) {
        throw new Error(`Service "${name}" not found in container.`);
      }

      const requiredDependencies =
        (ServiceClass as { deps?: string[] })[STATIC_FIELD] ?? [];
      for (const dep of requiredDependencies) {
        if (!this.registeredServices[dep]) {
          throw this.startupError(
            name,
            'instantiate',
            new Error(`Missing dependency "${dep}"`),
          );
        }
      }
      const config = this.serviceConfigs.get(ServiceClass);

      const createFn = (depsInstances: Record<string, Service<TContext>>) => {
        const abortController = new AbortController();
        this.options.abortSignal.addEventListener(
          'abort',
          () => abortController.abort(),
          { once: true },
        );

        const serviceContext: ServiceContext = {
          abortSignal: abortController.signal,
        };

        try {
          const finalConfig =
            typeof config === 'function' ? config() : (config ?? {});
          return new ServiceClass(
            { ctx: this.context, serviceContext },
            depsInstances,
            finalConfig,
          );
        } catch (error) {
          throw this.startupError(name, 'instantiate', error);
        }
      };

      return {
        name,
        dependencies: requiredDependencies,
        create: createFn,
      };
    });
  }

  private startupError(
    slotId: string,
    phase: ServiceStartupPhase,
    cause: unknown,
  ): ServiceStartupError {
    const error =
      cause instanceof ServiceStartupError
        ? cause
        : new ServiceStartupError(slotId, phase, cause);
    this.failedSlot = {
      slotId: error.slotId,
      phase: error.phase,
      message: error.message,
    };
    return error;
  }
}
