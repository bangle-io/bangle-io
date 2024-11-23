import { Logger } from '@bangle.io/logger';
export { default as waitForExpect } from 'wait-for-expect';

export const sleep = (ms = 15): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function makeTestLogger() {
  const mockLog = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return { logger: new Logger('', 'debug', mockLog as any), mockLog: mockLog };
}
