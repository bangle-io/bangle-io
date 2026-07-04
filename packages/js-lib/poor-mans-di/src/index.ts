import { type DependencyDefinition, recursiveInstantiate } from './recurse';

const STATIC_FIELD = 'deps';

/** @public */
export type Constructor<T, Arguments extends unknown[] = any[]> = new (
  ...arguments_: Arguments
) => T;

/** @public */
export type ServiceContext = {
  abortSignal: AbortSignal;
};

/** @public */
export interface Service<_TContext> {
  mountPromise?: Promise<void>;
  mount?: () => Promise<void>;
  /** True once the service has fully mounted. Used for diagnostics. */
  mounted?: boolean;
  postInstantiate?(): void;
}

/** @public */
export type ServiceStartupPhase = 'instantiate' | 'postInstantiate' | 'mount';

/** @public */
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

/** @public */
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

/** @public */
export type ConstructorConfig<TClass extends Constructor<any, any[]>> =
  TClass extends Constructor<any, [any, any, infer TConfig, ...any[]]>
    ? TConfig
    : never;

/**
 * A service map entry pairing a service class with the factory that produces
 * its constructor config. The factory runs lazily, immediately before the
 * service is constructed during `instantiateAll()`.
 */
/** @public */
export type ServiceSlot<
  TClass extends AnyServiceConstructor<any> = AnyServiceConstructor<any>,
> = {
  readonly kind: 'service-slot';
  readonly service: TClass;
  readonly config?: () => ConstructorConfig<TClass>;
};

/**
 * Declares a service slot together with its config. A service whose
 * constructor requires a config can only be registered through the two-arg
 * form — registering it bare (or via the one-arg form) fails to type-check,
 * so a required config can never silently go missing. The one-arg form exists
 * for config-less services that still want slot-shaped entries.
 */
/** @public */
export function slot<TClass extends AnyServiceConstructor<any>>(
  service: RequiresConfig<TClass> extends false ? TClass : never,
): ServiceSlot<TClass>;
/** @public */
export function slot<TClass extends AnyServiceConstructor<any>>(
  service: TClass,
  config: () => ConstructorConfig<TClass>,
): ServiceSlot<TClass>;
/** @public */
export function slot<TClass extends AnyServiceConstructor<any>>(
  service: TClass,
  config?: () => ConstructorConfig<TClass>,
): ServiceSlot<TClass> {
  return config
    ? { kind: 'service-slot', service, config }
    : { kind: 'service-slot', service };
}

/** @public */
export type ServiceMapEntry<TContext> =
  | AnyServiceConstructor<TContext>
  | ServiceSlot<AnyServiceConstructor<TContext>>;

/** The service class held by a map entry, whether bare or slotted. */
/** @public */
export type SlotClass<TEntry> =
  TEntry extends ServiceSlot<infer TClass extends AnyServiceConstructor<any>>
    ? TClass
    : TEntry extends AnyServiceConstructor<any>
      ? TEntry
      : never;

/** @public */
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

type ServiceMapInstances<TMap extends Record<string, ServiceMapEntry<any>>> = {
  [K in keyof TMap]: InstanceType<SlotClass<TMap[K]>>;
};

type DeclaredDependencyKeys<
  TMap extends Record<string, ServiceMapEntry<any>>,
  TClass,
> = Extract<StaticDependencies<TClass>[number], keyof TMap & string>;

type UnknownDependencyKeys<
  TMap extends Record<string, ServiceMapEntry<any>>,
  TClass,
> = Exclude<StaticDependencies<TClass>[number], keyof TMap & string>;

type ExpectedDependencies<
  TMap extends Record<string, ServiceMapEntry<any>>,
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
  TMap extends Record<string, ServiceMapEntry<any>>,
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

type IsValidServiceClass<
  TMap extends Record<string, ServiceMapEntry<any>>,
  TClass,
> =
  UnknownDependencyKeys<TMap, TClass> extends never
    ? DependencyKeyDrift<TMap, TClass> extends never
      ? ConstructorAcceptsExpectedDependencies<
          ExpectedDependencies<TMap, TClass>,
          ConstructorDependencies<TClass>
        >
      : false
    : false;

/**
 * True when the class can be constructed without a config argument, i.e. its
 * constructor declares at most `(context, dependencies)` as required
 * parameters. Such a class may be registered bare; anything else must be
 * registered via `slot()`.
 */
type RequiresConfig<TClass> = TClass extends new (
  context: any,
  dependencies: any,
) => any
  ? false
  : true;

type ValidateServiceMapEntry<
  TMap extends Record<string, ServiceMapEntry<any>>,
  TKey extends keyof TMap,
> =
  IsValidServiceClass<TMap, SlotClass<TMap[TKey]>> extends true
    ? TMap[TKey] extends ServiceSlot<any>
      ? TMap[TKey]
      : RequiresConfig<TMap[TKey]> extends false
        ? TMap[TKey]
        : never
    : never;

/**
 * Compile-time service graph validation. For every slot it rejects: static
 * deps naming an unregistered slot, drift between static deps and the
 * constructor's dependency keys, a registered instance that does not satisfy
 * the consumer's declared dependency type, and a bare entry whose constructor
 * requires a config (use `slot()` to attach one). `static deps` must be
 * declared `as const` — a widened `string[]` fails validation.
 */
/** @public */
export type ValidateServiceMap<
  TContext,
  TMap extends Record<string, ServiceMapEntry<TContext>>,
> = {
  [K in keyof TMap]: ValidateServiceMapEntry<TMap, K>;
};

/** @public */
export function defineServiceMap<TContext>() {
  return <const TMap extends Record<string, ServiceMapEntry<TContext>>>(
    serviceMap: TMap & ValidateServiceMap<TContext, TMap>,
  ): TMap => serviceMap;
}

/** @public */
export type ServiceToConstructor<T extends Service<any>> = new (
  param: T extends Service<infer C>
    ? { ctx: C; serviceContext: ServiceContext }
    : never,
  dependencies: Record<string, Service<unknown>>,
  config: any,
) => T;

/** @public */
export type ConstructorToInstance<
  T extends Record<string, Constructor<any> | ServiceSlot<any>>,
> = {
  [K in keyof T]: InstanceType<SlotClass<T[K]>>;
};

/** @public */
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

/**
 * The Container class manages the instantiation of services from a service
 * map. Configs travel with their slot (`slot(Class, () => config)`), so the
 * map is the complete composition — there is no post-construction mutation
 * phase.
 * Public API:
 *  - instantiateAll(focus?)
 *  - mountAll()
 *  - describe()
 */
/** @public */
export class Container<
  TContext,
  TContainer extends Record<string, ServiceMapEntry<TContext>>,
> {
  private registeredServices: Record<string, ServiceConstructor<TContext>> = {};
  private slotConfigs = new Map<string, () => unknown>();
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
        dependencies: (ServiceClass?.[STATIC_FIELD] ?? []).slice().sort(),
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
   * Slotted entries also register their config factory under the slot name.
   */
  private initializeRegisteredServices(serviceMap: TContainer): void {
    for (const key in serviceMap) {
      const entry = serviceMap[key];
      if (typeof entry === 'function') {
        this.registeredServices[key] = entry;
      } else if (
        entry &&
        typeof entry === 'object' &&
        entry.kind === 'service-slot'
      ) {
        this.registeredServices[key] = entry.service;
        if (entry.config) {
          this.slotConfigs.set(key, entry.config);
        }
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

      const requiredDependencies = ServiceClass[STATIC_FIELD] ?? [];
      for (const dep of requiredDependencies) {
        if (!this.registeredServices[dep]) {
          throw this.startupError(
            name,
            'instantiate',
            new Error(`Missing dependency "${dep}"`),
          );
        }
      }
      const configFactory = this.slotConfigs.get(name);

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
          const finalConfig = configFactory ? configFactory() : undefined;
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
        dependencies: requiredDependencies.slice(),
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
