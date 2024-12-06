import type { Logger } from '@bangle.io/logger';
import { makeTestLogger, makeTestService } from '@bangle.io/test-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BaseService } from '../base-service';
import { createAppError } from '../throw-app-error';

describe('BaseService', () => {
  let service: BaseService;
  let dependencies: Record<string, BaseService>;

  class TestService extends BaseService {
    constructor(
      baseOptions: BaseServiceCommonOptions & { needsConfig?: boolean },
      dependencies?: Record<string, BaseService>,
      name = 'TestService',
    ) {
      super({
        ...baseOptions,
        name: name,
        kind: 'platform',
        dependencies,
      });
    }
    protected async hookOnInitialize(): Promise<void> {
      // Simulate initialization
    }
    protected async hookOnDispose(): Promise<void> {
      // Simulate disposal
    }
    protected hookPostConfigSet(): void {}

    public triggerError(error: Error): void {
      this.emitAppError(error);
    }
  }

  let mockLog = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(() => {
    const { commonOpts, mockLog: _mockLog } = makeTestService();
    mockLog = _mockLog;
    service = new TestService(commonOpts, dependencies);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should emit an app error when emitAppError is called', async () => {
    const { commonOpts } = makeTestService();
    const service = new TestService(commonOpts, dependencies);
    const error = createAppError(
      'error::workspace:not-found',
      'Unknown error',
      {
        wsName: 'Unknown error',
      },
    );
    service.triggerError(error);

    expect(commonOpts.emitAppError).not.toHaveBeenCalledWith(error);

    // since we are using queueMicrotask, we need to wait for the next tick
    await Promise.resolve();

    expect(commonOpts.emitAppError).toHaveBeenCalledWith(error);
  });

  test('should initialize successfully without dependencies', async () => {
    await service.initialize();
    expect(mockLog.debug).toHaveBeenNthCalledWith(
      1,
      '[TestService]',
      'Creating service',
    );
    expect(mockLog.debug).toHaveBeenNthCalledWith(
      2,
      '[TestService]',
      'Initializing service',
    );
  });

  test('should dispose the service correctly', async () => {
    const { commonOpts, mockLog } = makeTestService();
    const service = new TestService(commonOpts, dependencies, 'TestService1');
    await service.initialize();
    await service.dispose();
    expect(mockLog.debug).toHaveBeenCalledWith(
      '[TestService1]',
      'Service disposed',
    );
  });

  test('should abort disposal if not initialized', async () => {
    const service = new TestService(
      makeTestService().commonOpts,
      dependencies,
      'TestService2',
    );
    await service.dispose();
    expect(mockLog.info).not.toHaveBeenCalled();
  });

  test('should initialize with dependencies', async () => {
    const { commonOpts, mockLog } = makeTestService();
    const depService = new TestService(commonOpts, dependencies, 'DepService');
    dependencies = { dep: depService };
    service = new TestService(commonOpts, dependencies);

    const initializeSpy = vi.spyOn(service, 'initialize');
    const depInitializeSpy = vi.spyOn(depService, 'initialize');
    const hookPostConfigSetSpy = vi.spyOn(
      service,
      // @ts-expect-error - hookPostConfigSet
      'hookPostConfigSet',
    );

    await service.initialize();

    expect(hookPostConfigSetSpy).not.toHaveBeenCalled();

    expect(depInitializeSpy).toHaveBeenCalled();
    expect(initializeSpy).toHaveBeenCalled();
    expect(mockLog.debug).toHaveBeenCalledWith(
      '[TestService]',
      "All dependencies 'DepService' initialized for service",
    );
  });

  test('should set initialization config when needed', () => {
    service = new TestService(
      { ...makeTestService().commonOpts, needsConfig: true },
      dependencies,
    );
    const hookPostConfigSetSpy = vi.spyOn(
      service,
      // @ts-expect-error - hookPostConfigSet
      'hookPostConfigSet',
    );

    const config = { key: 'value' };

    // @ts-expect-error - config
    service.setInitConfig(config);

    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    expect(service['config']).toEqual(config);
    expect(hookPostConfigSetSpy).toHaveBeenCalled();
  });

  test('should throw error when setting config if not needed', () => {
    service = new TestService(
      makeTestService().commonOpts,
      dependencies,
      'TestService',
    );

    // @ts-expect-error - config
    expect(() => service.setInitConfig({})).toThrow(
      'Config is not needed for service: TestService. Remove the config from the service.',
    );
  });
});
