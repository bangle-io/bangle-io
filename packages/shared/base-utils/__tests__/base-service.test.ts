import { Logger } from '@bangle.io/logger';
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
  }

  let baseLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    baseLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    logger = new Logger('', null, baseLogger as any);

    service = new TestService('TestService', 'platform', logger, dependencies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize successfully without dependencies', async () => {
    await service.initialize();
    expect(baseLogger.info).toHaveBeenNthCalledWith(
      1,
      '[TestService]',
      'Initializing service: TestService',
    );
    expect(baseLogger.info).toHaveBeenNthCalledWith(
      2,
      '[TestService]',
      'Service initialized: TestService',
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
    expect(baseLogger.info).toHaveBeenCalledWith(
      '[TestService1]',
      'Disposing service: TestService1',
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
    expect(baseLogger.info).not.toHaveBeenCalled;
  });
});
