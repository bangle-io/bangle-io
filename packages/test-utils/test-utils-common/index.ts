export { default as waitForExpect } from 'wait-for-expect';

export const sleep = (ms = 15): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
