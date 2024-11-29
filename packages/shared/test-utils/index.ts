import { Logger } from '@bangle.io/logger';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import { afterEach, vi } from 'vitest';
export { default as waitForExpect } from 'wait-for-expect';
import { RootEmitter } from '@bangle.io/root-emitter';
import { createStore } from 'jotai';

export const sleep = (ms = 15): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function makeTestLogger() {
  const mockLog = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return { logger: new Logger('', 'debug', mockLog as any), mockLog: mockLog };
}

export const makeTestService = () => {
  const { logger, mockLog } = makeTestLogger();
  const controller = new AbortController();
  const rootEmitter = new RootEmitter({
    abortSignal: new AbortController().signal,
  });
  const commonOpts: BaseServiceCommonOptions = {
    logger,
    store: createStore(),
    emitAppError: vi.fn(),
  };

  return { commonOpts, mockLog, controller, rootEmitter };
};
