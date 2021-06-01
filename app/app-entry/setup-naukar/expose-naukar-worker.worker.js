import * as Comlink from 'comlink';
import { Naukar, validateWorkerGlobalScope } from 'naukar-worker/index';
import { polyfills } from '../polyfill';
import { bangleIOContext } from '../create-bangle-io-context';
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

const naukar = new Naukar({ bangleIOContext });

Comlink.expose(naukar);
