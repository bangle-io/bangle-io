import { Logger } from '@bangle.io/logger';
export { default as waitForExpect } from 'wait-for-expect';

export const sleep = (ms = 15): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function makeTestLogger() {
  const log = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return { logger: new Logger('', null, log as any), log };
}
