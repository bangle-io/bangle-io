import { expectType } from '@bangle.io/mini-js-utils';
import { describe, expect, test, vi } from 'vitest';
import {
  Container,
  type Service,
  type ServiceContext,
  type ServiceToConstructor,
} from '../index';
import { recursiveInstantiate } from '../recurse';

describe('Container', () => {
  type TestContext = {
    env: string;
  };

  class ServiceA implements Service<TestContext> {
    constructor(
      _: { ctx: TestContext; serviceContext: ServiceContext },
      // biome-ignore lint/complexity/noBannedTypes: <explanation>
      _deps: {},
      public config: { name: string },
    ) {}
  }

  class ServiceB implements Service<TestContext> {
    static deps = ['serviceA'] as const;
    constructor(
      _: unknown,
      public dependencies: { serviceA: ServiceA },
      _config: undefined,
    ) {}
    postInstantiate() {}
  }

  class ServiceC implements Service<TestContext> {
    static deps = ['serviceA', 'serviceB'] as const;
    constructor(
      _: { ctx: TestContext; serviceContext: ServiceContext },
      public dependencies: { serviceA: ServiceA; serviceB: ServiceB },
      public config: { value: number },
    ) {}
    postInstantiate() {}
  }

  test('basic instantiation and type inference', () => {
    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: ServiceA,
        serviceB: ServiceB,
        serviceC: ServiceC,
      },
    );

    container.setConfig(ServiceA, { name: 'test' });
    container.setConfig(ServiceC, { value: 42 });

    const services = container.instantiateAll();

    expect(services.serviceA.config.name).toBe('test');
    expect(services.serviceC.config.value).toBe(42);
    expect(services.serviceB.dependencies.serviceA).toBe(services.serviceA);
    expect(services.serviceC.dependencies.serviceA).toBe(services.serviceA);
    expect(services.serviceC.dependencies.serviceB).toBe(services.serviceB);
  });

  test('last config wins', () => {
    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: ServiceA,
        serviceB: ServiceB,
        serviceC: ServiceC,
      },
    );

    container.setConfig(ServiceA, { name: 'test' });
    container.setConfig(ServiceC, { value: 42 });
    container.setConfig(ServiceC, { value: 2 });

    const services = container.instantiateAll();
    expect(services.serviceC.config.value).toBe(2);
  });

  test('service replacement with use()', () => {
    class MockServiceA extends ServiceA {
      mockMethod() {
        return 'mocked';
      }
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: ServiceA,
        serviceB: ServiceB,
      },
    );

    container.use('serviceA', MockServiceA);
    container.setConfig(MockServiceA, { name: 'mock' });

    const services = container.instantiateAll();

    expect(services.serviceA instanceof MockServiceA).toBe(true);
    expect((services.serviceA as MockServiceA).mockMethod()).toBe('mocked');
    expect(services.serviceB.dependencies.serviceA).toBe(services.serviceA);
  });

  test("configuring without config doesn't throw error", () => {
    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceB: class ServiceB {
          constructor(
            public contex: { ctx: TestContext; serviceContext: ServiceContext },
            public _deps: Record<string, never>,
          ) {}
          postInstantiate() {}
        },
      },
    );
    container.instantiateAll();
  });

  test('calling setConfig after instantiateAll throws', () => {
    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: ServiceA,
        serviceB: ServiceB,
      },
    );
    container.setConfig(ServiceA, { name: 'test' });
    container.instantiateAll();
    expect(() => container.setConfig(ServiceA, { name: 'again' })).toThrowError(
      'Cannot call setConfig() after instantiateAll() has been called.',
    );
  });

  test('abort signal propagation', () => {
    const abortController = new AbortController();
    const abortSpy = vi.fn();

    class TestServiceA implements Service<TestContext> {
      config!: { name: string };
      constructor(
        {
          ctx,
          serviceContext,
        }: { ctx: TestContext; serviceContext: ServiceContext },
        _deps: Record<string, never>,
      ) {
        serviceContext.abortSignal?.addEventListener('abort', () => {
          abortSpy();
        });
      }
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: abortController.signal },
      {
        serviceA: TestServiceA,
      },
    );

    container.setConfig(TestServiceA, { name: 'test' });
    container.instantiateAll();
    abortController.abort();
    expect(abortSpy).toHaveBeenCalled();
  });

  test('mounting services', async () => {
    const mountSpy = vi.fn();

    class MountableService implements Service<TestContext> {
      mountPromise: Promise<void>;

      constructor(
        _context: { ctx: TestContext; serviceContext: ServiceContext },
        _deps: Record<string, never>,
      ) {
        this.mountPromise = Promise.resolve().then(() => {
          mountSpy();
        });
      }
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        mountable: MountableService,
      },
    );

    const services = container.instantiateAll();

    await services.mountable.mountPromise;
    expect(mountSpy).toHaveBeenCalled();
  });

  test('prevents multiple instantiation', () => {
    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: ServiceA,
      },
    );

    container.setConfig(ServiceA, { name: 'test' });
    container.instantiateAll();

    expect(() => {
      container.instantiateAll();
    }).toThrowError('instantiateAll() can only be called once.');
  });

  test('interface placeholder behavior', () => {
    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceInterface: {} as any,
      },
    );

    expect(() => {
      container.instantiateAll();
    }).toThrow(
      /Service "serviceInterface" is only defined as an interface placeholder/,
    );
  });

  test('dependency not found error', () => {
    class ServiceWithMissingDep implements Service<TestContext> {
      static deps = ['nonExistent'] as const;

      constructor(
        public _params: { ctx: TestContext; serviceContext: ServiceContext },
        public _deps: { nonExistent: Service<TestContext> },
      ) {}

      postInstantiate() {}
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        broken: ServiceWithMissingDep,
      },
    );

    expect(() => {
      container.instantiateAll();
    }).toThrowError("No dependency definition found for 'nonExistent'");
  });

  test('use method type safety and runtime behavior', () => {
    interface IServiceX extends Service<any> {
      method(): string;
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceX: {} as ServiceToConstructor<IServiceX>,
      },
    );

    class ConcreteServiceX implements IServiceX {
      constructor(
        public _: { ctx: TestContext; serviceContext: ServiceContext },
        public _deps: Record<string, never>,
      ) {}
      method() {
        return 'concrete';
      }
      postInstantiate(): void {}
    }

    container.use('serviceX', ConcreteServiceX);

    const services = container.instantiateAll();

    expect(services.serviceX.method()).toBe('concrete');
    expectType<IServiceX, typeof services.serviceX>(services.serviceX);
  });

  test('use method cannot be called after instantiation', () => {
    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: ServiceA,
      },
    );

    container.setConfig(ServiceA, { name: 'test' });
    container.instantiateAll();

    expect(() => {
      container.use('serviceA', ServiceA);
    }).toThrowError(
      'Cannot call use() after instantiateAll() has been called.',
    );
  });

  test('replacing existing class with similar implementation', () => {
    class OriginalService implements Service<TestContext> {
      config!: { value: number };
      constructor(
        private context: { ctx: TestContext; serviceContext: ServiceContext },
        private _deps: Record<string, never>,
      ) {}
      getValue() {
        return this.config.value;
      }
    }

    class ReplacementService implements Service<TestContext> {
      config!: {
        value: number;
        value2: boolean;
      };
      constructor(
        private context: { ctx: TestContext; serviceContext: ServiceContext },
        private _deps: {
          serviceA: ServiceA;
        },
      ) {}
      getValue() {
        return 0;
      }
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        service: OriginalService,
      },
    );

    // This is allowed even though config shape differs, as test ensures runtime flexibility.
    container.use(
      'service',
      // @ts-expect-error
      ReplacementService,
    );
    container.setConfig(ReplacementService, { value: 5, value2: true });

    const services = container.instantiateAll();

    expect(services.service instanceof ReplacementService).toBe(true);
    expect(services.service.getValue()).toBe(0);
  });

  test('mountAll should call mount on all services', async () => {
    class MountableServiceA implements Service<TestContext> {
      mount = vi.fn().mockResolvedValue(undefined);
      constructor(
        public contex: { ctx: TestContext; serviceContext: ServiceContext },
        public _deps: Record<string, never>,
      ) {}
    }

    class MountableServiceB implements Service<TestContext> {
      mount = vi.fn().mockResolvedValue(undefined);
      constructor(
        public context: { ctx: TestContext; serviceContext: ServiceContext },
        public _deps: Record<string, never>,
      ) {}
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: MountableServiceA,
        serviceB: MountableServiceB,
      },
    );

    const services = container.instantiateAll();
    await container.mountAll();
    expect(services.serviceA.mount).toHaveBeenCalled();
    expect(services.serviceB.mount).toHaveBeenCalled();
  });

  test('mountAll should throw if instantiateAll has not been called', async () => {
    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: class {
          mount = vi.fn().mockResolvedValue(undefined);
          constructor(
            public context: {
              ctx: TestContext;
              serviceContext: ServiceContext;
            },
            public _deps: Record<string, never>,
          ) {}
        },
      },
    );

    await expect(container.mountAll()).rejects.toThrowError(
      'instantiateAll() must be called before mountAll().',
    );
  });

  test('mountAll should be idempotent', async () => {
    class MountableService implements Service<TestContext> {
      mount = vi.fn().mockResolvedValue(undefined);
      constructor(
        public context: { ctx: TestContext; serviceContext: ServiceContext },
        public _deps: Record<string, never>,
      ) {}
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: MountableService,
      },
    );

    container.instantiateAll();
    await container.mountAll();
    await container.mountAll(); // should not throw or cause issues
  });

  test('static deps determine constructor parameters', () => {
    class TestServiceWithDeps implements Service<TestContext> {
      static deps = ['serviceA', 'serviceB'] as const;

      constructor(
        _params: { ctx: TestContext; serviceContext: ServiceContext },
        public readonly deps: { serviceA: ServiceA; serviceB: ServiceB },
      ) {}

      postInstantiate(): void {}
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceA: ServiceA,
        serviceB: ServiceB,
        testService: TestServiceWithDeps,
      },
    );

    container.setConfig(ServiceA, { name: 'test' });
    const services = container.instantiateAll();

    expect(services.testService.deps.serviceA).toBe(services.serviceA);
    expect(services.testService.deps.serviceB).toBe(services.serviceB);
  });

  test('throws error when missing required dependency', () => {
    class ServiceWithMissingDep implements Service<TestContext> {
      static deps = ['nonExistent'] as const;

      constructor(
        public _params: { ctx: TestContext; serviceContext: ServiceContext },
        public _deps: { nonExistent: Service<TestContext> },
      ) {}

      postInstantiate(): void {}
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        broken: ServiceWithMissingDep,
      },
    );

    expect(() => {
      container.instantiateAll();
    }).toThrow(/No dependency definition found for 'nonExistent'/);
  });

  test('cyclic dependency detection', () => {
    class ServiceX implements Service<TestContext> {
      static deps = ['serviceY'] as const;
      constructor(
        public _params: { ctx: TestContext; serviceContext: ServiceContext },
        public _deps: { serviceY: ServiceY },
      ) {}
      postInstantiate(): void {}
    }

    class ServiceY implements Service<TestContext> {
      static deps = ['serviceX'] as const;
      constructor(
        public _params: { ctx: TestContext; serviceContext: ServiceContext },
        public _deps: { serviceX: ServiceX },
      ) {}

      postInstantiate(): void {}
    }

    const container = new Container(
      { context: { env: 'test' }, abortSignal: new AbortController().signal },
      {
        serviceX: ServiceX,
        serviceY: ServiceY,
      },
    );

    expect(() => {
      container.instantiateAll();
    }).toThrow(/Cycle detected/);
  });
});

describe('recursiveInstantiate', () => {
  test('basic instantiation with no dependencies', () => {
    const deps = [
      {
        name: 'serviceA',
        dependencies: [],
        create: () => ({ value: 'A' }),
      },
    ];

    const result = recursiveInstantiate(deps);
    expect(result.serviceA).toEqual({ value: 'A' });
  });

  test('instantiation with simple dependencies', () => {
    const deps = [
      {
        name: 'serviceA',
        dependencies: [],
        create: () => ({ value: 'A' }),
      },
      {
        name: 'serviceB',
        dependencies: ['serviceA'],
        create: (deps) => ({ value: 'B', depA: deps.serviceA }),
      },
    ];

    const result = recursiveInstantiate(deps);
    expect(result.serviceA).toEqual({ value: 'A' });
    expect(result.serviceB.value).toBe('B');
    expect(result.serviceB.depA).toBe(result.serviceA);
  });

  test('throws on cyclic dependencies', () => {
    const deps = [
      {
        name: 'serviceA',
        dependencies: ['serviceB'],
        create: () => ({ value: 'A' }),
      },
      {
        name: 'serviceB',
        dependencies: ['serviceA'],
        create: () => ({ value: 'B' }),
      },
    ];

    expect(() => recursiveInstantiate(deps)).toThrow(/Cycle detected/);
  });

  test('throws on missing dependency', () => {
    const deps = [
      {
        name: 'serviceA',
        dependencies: ['nonExistent'],
        create: () => ({ value: 'A' }),
      },
    ];

    expect(() => recursiveInstantiate(deps)).toThrow(
      /No dependency definition found for 'nonExistent'/,
    );
  });

  test('complex dependency tree resolution', () => {
    const deps = [
      {
        name: 'serviceA',
        dependencies: [],
        create: () => ({ value: 'A' }),
      },
      {
        name: 'serviceB',
        dependencies: ['serviceA'],
        create: (deps: any) => ({ value: 'B', depA: deps.serviceA }),
      },
      {
        name: 'serviceC',
        dependencies: ['serviceB'],
        create: (deps: any) => ({ value: 'C', depB: deps.serviceB }),
      },
      {
        name: 'serviceD',
        dependencies: ['serviceA', 'serviceC'],
        create: (deps: any) => ({
          value: 'D',
          depA: deps.serviceA,
          depC: deps.serviceC,
        }),
      },
    ];

    const result = recursiveInstantiate(deps);
    expect(result.serviceD?.depA).toBe(result.serviceA);
    expect(result.serviceD?.depC).toBe(result.serviceC);
    expect(result.serviceC?.depB).toBe(result.serviceB);
    expect(result.serviceB?.depA).toBe(result.serviceA);
  });

  test('handles independent services', () => {
    const deps = [
      {
        name: 'serviceA',
        dependencies: [],
        create: () => ({ value: 'A' }),
      },
      {
        name: 'serviceB',
        dependencies: [],
        create: () => ({ value: 'B' }),
      },
    ];

    const result = recursiveInstantiate(deps);
    expect(result.serviceA).toEqual({ value: 'A' });
    expect(result.serviceB).toEqual({ value: 'B' });
  });
});
