import type { Logger } from '@bangle.io/logger';
import { makeTestLogger } from '@bangle.io/test-utils';
import { BaseService } from '../base-service';

describe('BaseService', () => {
  let logger: Logger;
  let service: BaseService;
  let dependencies: Record<string, BaseService>;

  class TestService extends BaseService {
    protected async onInitialize(): Promise<void> {
      // Simulate initialization
    }

    protected async onDispose(): Promise<void> {
      // Simulate disposal
    }
    protected hookPostConfigSet(): void {}
  }

  let mockLog = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    ({ mockLog: mockLog, logger } = makeTestLogger());

    service = new TestService('TestService', 'platform', logger, dependencies);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    const service = new TestService(
      'TestService1',
      'platform',
      logger,
      dependencies,
    );

    await service.initialize();
    await service.dispose();
    expect(mockLog.debug).toHaveBeenCalledWith(
      '[TestService1]',
      'Service disposed',
    );
  });

  test('should abort disposal if not initialized', async () => {
    const service = new TestService(
      'TestService2',
      'platform',
      logger,
      dependencies,
    );
    await service.dispose();
    expect(mockLog.info).not.toHaveBeenCalled;
  });

  test('should initialize with dependencies', async () => {
    const depService = new TestService('DepService', 'platform', logger);
    dependencies = { dep: depService };
    service = new TestService('TestService', 'platform', logger, dependencies);

    const initializeSpy = jest.spyOn(service, 'initialize');
    const depInitializeSpy = jest.spyOn(depService, 'initialize');
    const hookPostConfigSetSpy = jest.spyOn(
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
    service = new TestService('TestService', 'platform', logger, dependencies, {
      needsConfig: true,
    });
    const hookPostConfigSetSpy = jest.spyOn(
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
    service = new TestService('TestService', 'platform', logger, dependencies);

    // @ts-expect-error - config
    expect(() => service.setInitConfig({})).toThrow(
      'Config is not needed for service: TestService. Remove the config from the service.',
    );
  });
});
