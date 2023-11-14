import { createNaukarStore } from '@bangle.io/naukar-store';
import type { EternalVarsWorker, NaukarBare } from '@bangle.io/shared-types';

import { logger } from './logger';

export interface NaukarConfig {
  eternalVars: EternalVarsWorker;
}

export class Naukar implements NaukarBare {
  private store: ReturnType<typeof createNaukarStore>;

  constructor(private naukarConfig: NaukarConfig) {
    logger.debug('naukarConfig', naukarConfig);
    this.store = createNaukarStore({ eternalVars: naukarConfig.eternalVars });
  }

  // NOTE: all public interfaces are accessible by the main thread
  ok() {
    return true;
  }

  getDebugFlags() {
    return this.naukarConfig.eternalVars.debugFlags;
  }
}
