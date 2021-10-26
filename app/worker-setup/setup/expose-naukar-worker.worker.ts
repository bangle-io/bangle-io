import * as Comlink from 'comlink';

import { validateWorkerGlobalScope } from '@bangle.io/naukar-worker';
import { polyfills } from '@bangle.io/shared/polyfill';

import naukar from './naukar-init';

validateWorkerGlobalScope();
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
