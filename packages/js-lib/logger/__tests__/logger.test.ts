// logger.test.ts

import { Logger, setGlobalLogLevel } from '../index';

describe('Logger', () => {
  function makeLogger(): any {
    return {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  }

  afterEach(() => {
    jest.clearAllMocks();
    setGlobalLogLevel('info');
  });

  test('logs messages at or above the global log level', () => {
    const baseLogger = makeLogger();
    const logger = new Logger('TestLogger', null, baseLogger);
    logger.info('Info message');
    logger.warn('Warning message');

    expect(baseLogger.info).toHaveBeenCalledWith(
      '[TestLogger]',
      'Info message',
    );
    expect(baseLogger.warn).toHaveBeenCalledWith(
      '[TestLogger]',
      'Warning message',
    );
    expect(baseLogger.debug).not.toHaveBeenCalled();
    expect(baseLogger.error).not.toHaveBeenCalled();
  });

  test('does not log messages below the global log level', () => {
    const baseLogger = makeLogger();
    const logger = new Logger('TestLogger', null, baseLogger);
    logger.debug('Debug message');

    expect(baseLogger.debug).not.toHaveBeenCalled();
  });

  test('logs messages when global log level is changed', () => {
    setGlobalLogLevel('debug');
    const baseLogger = makeLogger();
    const logger = new Logger('TestLogger', null, baseLogger);
    logger.debug('Debug message');

    expect(baseLogger.debug).toHaveBeenCalledWith(
      '[TestLogger]',
      'Debug message',
    );
  });

  test('prefixes log messages correctly', () => {
    const baseLogger = makeLogger();
    const logger = new Logger('Main', null, baseLogger);
    logger.info('Main logger message');

    expect(baseLogger.info).toHaveBeenCalledWith(
      '[Main]',
      'Main logger message',
    );

    const childLogger = logger.child('Child');
    childLogger.info('Child logger message');

    expect(baseLogger.info).toHaveBeenCalledWith(
      '[Main:Child]',
      'Child logger message',
    );
  });

  test('child logger inherits parent log level if not set', () => {
    setGlobalLogLevel('warn');
    const baseLogger = makeLogger();
    const parentLogger = new Logger('Parent', null, baseLogger);
    const childLogger = parentLogger.child('Child');

    childLogger.info('This should not be logged');
    childLogger.warn('This should be logged');

    expect(baseLogger.info).not.toHaveBeenCalled();
    expect(baseLogger.warn).toHaveBeenCalledWith(
      '[Parent:Child]',
      'This should be logged',
    );
  });

  test('local log level overrides global log level', () => {
    setGlobalLogLevel('error');
    const baseLogger = makeLogger();
    const logger = new Logger('TestLogger', 'debug', baseLogger);

    logger.debug('Debug message');
    logger.info('Info message');
    logger.error('Error message');

    expect(baseLogger.debug).toHaveBeenCalledWith(
      '[TestLogger]',
      'Debug message',
    );
    expect(baseLogger.info).toHaveBeenCalledWith(
      '[TestLogger]',
      'Info message',
    );
    expect(baseLogger.error).toHaveBeenCalledWith(
      '[TestLogger]',
      'Error message',
    );
  });

  test('changing global log level affects loggers without local log level', () => {
    const baseLogger = makeLogger();
    const logger = new Logger('TestLogger', null, baseLogger);
    logger.debug('This should not be logged');

    expect(baseLogger.debug).not.toHaveBeenCalled();

    setGlobalLogLevel('debug');
    logger.debug('This should be logged now');

    expect(baseLogger.debug).toHaveBeenCalledWith(
      '[TestLogger]',
      'This should be logged now',
    );
  });

  test('changing global log level does not affect loggers with local log level', () => {
    const baseLogger = makeLogger();
    const logger = new Logger('TestLogger', 'info', baseLogger);
    setGlobalLogLevel('debug');

    logger.info('Info message');
    logger.debug('Debug message');

    expect(baseLogger.info).toHaveBeenCalledWith(
      '[TestLogger]',
      'Info message',
    );
    expect(baseLogger.debug).not.toHaveBeenCalled();
  });

  test('logs messages with correct methods based on log level', () => {
    const baseLogger = makeLogger();
    const logger = new Logger('TestLogger', null, baseLogger);
    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');

    expect(baseLogger.error).toHaveBeenCalledWith(
      '[TestLogger]',
      'Error message',
    );
    expect(baseLogger.warn).toHaveBeenCalledWith(
      '[TestLogger]',
      'Warning message',
    );
    expect(baseLogger.info).toHaveBeenCalledWith(
      '[TestLogger]',
      'Info message',
    );
  });
});
