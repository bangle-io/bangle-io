import * as Comlink from 'comlink';
import {
  Brahmaan,
  workerInitialSetup,
  validateWorkerGlobalScope,
} from 'brahmaan-worker/index';
import { bangleIOContext } from 'create-bangle-io-context/index';
validateWorkerGlobalScope();
workerInitialSetup();

const brahmaan = new Brahmaan({ bangleIOContext });

Comlink.expose(brahmaan);
