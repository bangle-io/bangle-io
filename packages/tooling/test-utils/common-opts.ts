import { Logger } from '@bangle.io/logger';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import { vi } from 'vitest';

export { default as waitForExpect } from 'wait-for-expect';

import { RootEmitter } from '@bangle.io/root-emitter';
import { createStore } from 'jotai';

export * from './test-service-setup';

export type MockLog = ReturnType<typeof getMockLog>;

const getMockLog = () => {
  const mockLog = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return mockLog;
};

export const sleep = (ms = 15): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function makeTestLogger() {
  const mockLog = getMockLog();
  return {
    logger: new Logger('', 'debug', mockLog as any),
    mockLog,
  };
}

export const makeTestCommonOpts = ({
  controller = new AbortController(),
}: {
  controller?: AbortController;
} = {}) => {
  const { logger, mockLog } = makeTestLogger();
  const rootEmitter = new RootEmitter({
    abortSignal: controller.signal,
  });
  const commonOpts: BaseServiceCommonOptions = {
    logger,
    store: createStore(),
    emitAppError: vi.fn(),
    rootAbortSignal: controller.signal,
  };

  /**
   * Only use this if you are testing service individually
   */
  const testServiceContext = {
    ctx: commonOpts,
    serviceContext: {
      abortSignal: commonOpts.rootAbortSignal,
    },
  };

  return { commonOpts, mockLog, controller, rootEmitter, testServiceContext };
};
