import '../comlink-transfer-handlers';

import * as Comlink from 'comlink';

import { polyfills } from '@bangle.io/shared';
import { assertWorkerGlobalScope } from '@bangle.io/utils';

import naukar from './naukar-init';

console.log('naukar initialized :) t=', performance.now());

assertWorkerGlobalScope();

workerInitialSetup();
/**
 * Things to initialize when starting a webworker
 */
async function workerInitialSetup() {
  // TODO: since this async, will polyfilling work
  if (polyfills.length > 0) {
    await Promise.all(polyfills);
  }
}
Comlink.expose(naukar);
