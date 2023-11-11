import * as Comlink from 'comlink';

import { assertWorkerGlobalScope } from '@bangle.io/global-scope-helpers';
import { Naukar } from '@bangle.io/naukar';
import { setupEternalVarsWorker } from '@bangle.io/setup-eternal-vars/worker';

assertWorkerGlobalScope();

const naukar = new Naukar({
  eternalVars: setupEternalVarsWorker({ type: 'worker' }),
});

Comlink.expose(naukar);
