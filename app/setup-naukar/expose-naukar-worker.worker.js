import * as Comlink from 'comlink';
import {
  Naukar,
  workerInitialSetup,
  validateWorkerGlobalScope,
} from 'naukar-worker/index';
import { bangleIOContext } from '../create-bangle-io-context';
validateWorkerGlobalScope();
workerInitialSetup();

const naukar = new Naukar({ bangleIOContext });

Comlink.expose(naukar);
