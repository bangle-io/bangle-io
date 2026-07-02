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
  /** True once the service has fully mounted. Used for diagnostics. */
  mounted?: boolean;
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
  TDeps extends Record<string, Service<any>> | null = Record<
    string,
    Service<any>
  >,
  TConfig = any,
> = Constructor<
  Service<TContext>,
  [{ ctx: TContext; serviceContext: ServiceContext }, TDeps, TConfig]
> & {
  readonly deps?: readonly string[];
};

type AnyServiceConstructor<TContext> = ServiceConstructor<TContext, any, any>;

export type ServiceDependencies<
  TServices extends Record<string, Service<any>>,
  TDeps extends readonly (keyof TServices & string)[],
> = Pick<TServices, TDeps[number]>;

type StaticDependencies<TClass> = TClass extends {
  readonly deps: infer TDeps;
}
  ? TDeps extends readonly string[]
    ? TDeps
    : readonly []
  : readonly [];

type ConstructorDependencies<TClass> = TClass extends abstract new (
  ...arguments_: infer TArguments
) => unknown
  ? TArguments extends [any, infer TDeps, ...unknown[]]
    ? TDeps
    : never
  : never;

type ConstructorDependencyKeys<TClass> =
  ConstructorDependencies<TClass> extends null
    ? never
    : keyof ConstructorDependencies<TClass> & string;

type ServiceMapInstances<
  TMap extends Record<string, AnyServiceConstructor<any>>,
> = {
  [K in keyof TMap]: InstanceType<TMap[K]>;
};

type DeclaredDependencyKeys<
  TMap extends Record<string, AnyServiceConstructor<any>>,
  TClass,
> = Extract<StaticDependencies<TClass>[number], keyof TMap & string>;

type UnknownDependencyKeys<
  TMap extends Record<string, AnyServiceConstructor<any>>,
  TClass,
> = Exclude<StaticDependencies<TClass>[number], keyof TMap & string>;

type ExpectedDependencies<
  TMap extends Record<string, AnyServiceConstructor<any>>,
  TClass,
> = Pick<ServiceMapInstances<TMap>, DeclaredDependencyKeys<TMap, TClass>>;

type ConstructorAcceptsExpectedDependencies<TExpected, TActual> =
  TActual extends null
    ? keyof TExpected extends never
      ? true
      : false
    : TExpected extends TActual
      ? true
      : false;

type DependencyKeyDrift<
  TMap extends Record<string, AnyServiceConstructor<any>>,
  TClass,
> =
  | Exclude<
      DeclaredDependencyKeys<TMap, TClass>,
      ConstructorDependencyKeys<TClass>
    >
  | Exclude<
      ConstructorDependencyKeys<TClass>,
      DeclaredDependencyKeys<TMap, TClass>
    >;

type ValidateServiceConstructor<
  TContext,
  TMap extends Record<string, AnyServiceConstructor<TContext>>,
  TKey extends keyof TMap,
> =
  UnknownDependencyKeys<TMap, TMap[TKey]> extends never
    ? DependencyKeyDrift<TMap, TMap[TKey]> extends never
      ? ConstructorAcceptsExpectedDependencies<
          ExpectedDependencies<TMap, TMap[TKey]>,
          ConstructorDependencies<TMap[TKey]>
        > extends true
        ? TMap[TKey]
        : never
      : never
    : never;

/**
 * Compile-time service graph validation. For every slot it rejects: static
 * deps naming an unregistered slot, drift between static deps and the
 * constructor's dependency keys, and a registered instance that does not
 * satisfy the consumer's declared dependency type. `static deps` must be
 * declared `as const` — a widened `string[]` fails validation.
 */
export type ValidateServiceMap<
  TContext,
  TMap extends Record<string, AnyServiceConstructor<TContext>>,
> = {
  [K in keyof TMap]: ValidateServiceConstructor<TContext, TMap, K>;
};

export function defineServiceMap<TContext>() {
  return <const TMap extends Record<string, AnyServiceConstructor<TContext>>>(
    serviceMap: TMap & ValidateServiceMap<TContext, TMap>,
  ): TMap => serviceMap;
}

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
        mounted: instance?.mounted === true,
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
