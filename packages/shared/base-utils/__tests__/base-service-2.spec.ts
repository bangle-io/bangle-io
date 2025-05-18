import { Container, type ServiceContext } from '@bangle.io/poor-mans-di';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { BaseService, type BaseServiceContext } from '../base-service';

describe('BaseService', () => {
  class TestService extends BaseService {
    dep = {};
    mockHookMount = vi.fn();

    constructor(
      context: BaseServiceContext,
      dependencies: null,
      name = 'TestService',
    ) {
      super(name, context, dependencies);
    }

    hookMount(): void | Promise<void> {
      this.mockHookMount();
    }
  }

  async function setup() {
    const testOpts = makeTestCommonOpts();
    const mockLog = testOpts.mockLog;
    const commonOpts = testOpts.commonOpts;
    const abortController = new AbortController();
    const serviceContext: ServiceContext = {
      abortSignal: abortController.signal,
    };
    return { mockLog, commonOpts, abortController, serviceContext };
  }

  test('should create service with correct initialization', async () => {
    const { mockLog, commonOpts, serviceContext } = await setup();
    const service = new TestService(
      { ctx: commonOpts, serviceContext },
      null,
      'TestService',
    );

    expect(service.name).toBe('TestService');
    expect(service.abortSignal).toBe(serviceContext.abortSignal);
    expect(mockLog.debug).toHaveBeenCalledWith(
      '[TestService]',
      'Creating service',
    );
  });

  test('should handle mounting correctly', async () => {
    const { mockLog, commonOpts, serviceContext } = await setup();
    const service = new TestService(
      { ctx: commonOpts, serviceContext },
      null,
      'TestService',
    );

    await service.mount();

    expect(service.mockHookMount).toHaveBeenCalledTimes(1);
    expect(mockLog.debug).toHaveBeenCalledWith(
      '[TestService]',
      'Mounting service',
    );
  });

  test('should mount dependencies before self', async () => {
    const { commonOpts, serviceContext } = await setup();

    class DepService extends BaseService {
      dep = {};
      mockHookMount = vi.fn();

      constructor(context: BaseServiceContext, dependencies: null) {
        super('DepService', context, dependencies);
      }

      hookMount(): void {
        this.mockHookMount();
      }
    }

    const depService = new DepService(
      { ctx: commonOpts, serviceContext },
      null,
    );

    class ServiceWithDep extends BaseService {
      dep = { depService };
      mockHookMount = vi.fn();

      constructor(
        context: BaseServiceContext,
        dependencies: { depService: DepService },
      ) {
        super('ServiceWithDep', context, dependencies);
      }

      hookMount(): void {
        this.mockHookMount();
      }
    }

    const service = new ServiceWithDep(
      { ctx: commonOpts, serviceContext },
      { depService },
    );
    const depMountSpy = vi.spyOn(depService, 'mount');

    await service.mount();

    expect(depMountSpy).toHaveBeenCalled();
    expect(service.mockHookMount).toHaveBeenCalled();
  });

  test('should handle cleanup callbacks on abort', async () => {
    const { mockLog, commonOpts, abortController, serviceContext } =
      await setup();
    const service = new TestService(
      { ctx: commonOpts, serviceContext },
      null,
      'TestService',
    );
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();

    service.addCleanup(cleanup1, cleanup2);
    abortController.abort();

    expect(cleanup1).toHaveBeenCalled();
    expect(cleanup2).toHaveBeenCalled();
    expect(mockLog.debug).toHaveBeenCalledWith(
      '[TestService]',
      'Aborting service',
    );
  });

  test('should only mount once', async () => {
    const { commonOpts, serviceContext } = await setup();
    const service = new TestService(
      { ctx: commonOpts, serviceContext },
      null,
      'TestService',
    );

    const promise1 = service.mount();
    const promise2 = service.mount();
    expect(promise1).toBe(promise2);
    await Promise.all([promise1, promise2]);

    expect(service.mockHookMount).toHaveBeenCalledTimes(1);
  });

  test('should handle complex dependency chains', async () => {
    const { commonOpts, serviceContext } = await setup();

    class ServiceA extends BaseService {
      dep = {};
      mockHookMount = vi.fn();

      constructor(context: BaseServiceContext, dependencies: null) {
        super('ServiceA', context, dependencies);
      }

      hookMount(): void {
        this.mockHookMount();
      }
    }

    class ServiceB extends BaseService {
      dep = {};
      mockHookMount = vi.fn();

      constructor(context: BaseServiceContext, dependencies: null) {
        super('ServiceB', context, dependencies);
      }

      hookMount(): void {
        this.mockHookMount();
      }
    }

    const serviceA = new ServiceA({ ctx: commonOpts, serviceContext }, null);
    const serviceB = new ServiceB({ ctx: commonOpts, serviceContext }, null);

    class ServiceC extends BaseService {
      dep = { serviceA, serviceB };
      mockHookMount = vi.fn();

      constructor(
        context: BaseServiceContext,
        dependencies: { serviceA: ServiceA; serviceB: ServiceB },
      ) {
        super('ServiceC', context, dependencies);
      }

      hookMount(): void {
        this.mockHookMount();
      }
    }

    const serviceC = new ServiceC(
      { ctx: commonOpts, serviceContext },
      { serviceA, serviceB },
    );

    const spyA = vi.spyOn(serviceA, 'mount');
    const spyB = vi.spyOn(serviceB, 'mount');
    const spyC = vi.spyOn(serviceC, 'mockHookMount');

    await serviceC.mount();

    expect(spyA).toHaveBeenCalled();
    expect(spyB).toHaveBeenCalled();
    expect(spyC).toHaveBeenCalled();
  });

  test('should maintain mounted state', async () => {
    const { commonOpts, serviceContext } = await setup();
    const service = new TestService(
      { ctx: commonOpts, serviceContext },
      null,
      'TestService',
    );

    expect(service.mounted).toBe(false);
    await service.mount();
    expect(service.mounted).toBe(true);
  });

  test('integration with Container - should handle dependency chain properly', async () => {
    const { commonOpts, abortController } = await setup();
    const mountOrder: string[] = [];

    class ServiceA extends BaseService {
      constructor(context: BaseServiceContext, dependencies: null) {
        super('ServiceA', context, dependencies);
      }

      async hookMount() {
        await new Promise((r) => setTimeout(r, 4));
        mountOrder.push(this.name);
      }
    }

    class ServiceB extends BaseService {
      static deps = ['serviceA'];

      constructor(
        context: BaseServiceContext,
        dependencies: { serviceA: ServiceA },
      ) {
        super('ServiceB', context, dependencies);
      }

      async hookMount() {
        await new Promise((r) => setTimeout(r, 1));
        mountOrder.push(this.name);
      }
    }

    class ServiceC extends BaseService {
      static deps = ['serviceB'];

      constructor(
        context: BaseServiceContext,
        dependencies: { serviceB: ServiceB },
      ) {
        super('ServiceC', context, dependencies);
      }

      async hookMount() {
        mountOrder.push(this.name);
      }
    }

    const container = new Container(
      { context: commonOpts, abortSignal: abortController.signal },
      {
        serviceA: ServiceA,
        serviceB: ServiceB,
        serviceC: ServiceC,
      },
    );

    const services = container.instantiateAll();

    await services.serviceC.mount();

    expect(mountOrder).toEqual(['ServiceA', 'ServiceB', 'ServiceC']);
  });

  test('should replace service using container.use()', async () => {
    const { commonOpts, abortController } = await setup();

    class MainService extends BaseService {
      mockHookMount = vi.fn();
      dep = {};

      constructor(context: BaseServiceContext, dependencies: null) {
        super('MainService', context, dependencies);
      }

      hookMount(): void {
        this.mockHookMount();
      }
    }

    class ReplacementService extends BaseService {
      mockHookMount = vi.fn();
      dep = {};

      constructor(context: BaseServiceContext, dependencies: null) {
        super('ReplacementService', context, dependencies);
      }

      hookMount(): void {
        this.mockHookMount();
      }
    }

    const container = new Container(
      { context: commonOpts, abortSignal: abortController.signal },
      {
        originalService: MainService,
      },
    );

    container.use('originalService', ReplacementService);
    const services = container.instantiateAll();

    await services.originalService.mount();

    expect(services.originalService).toBeInstanceOf(ReplacementService);
    expect(services.originalService.mockHookMount).toHaveBeenCalled();
  });
});
