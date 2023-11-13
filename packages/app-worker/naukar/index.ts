import { config } from '@bangle.io/config';
import type { EternalVarsWorker, NaukarBare } from '@bangle.io/shared-types';

import { logger } from './logger';

export interface NaukarConfig {
  eternalVars: EternalVarsWorker;
}

export class Naukar implements NaukarBare {
  constructor(private naukarConfig: NaukarConfig) {
    logger.info('naukarConfig', naukarConfig);
  }

  ok() {
    return true;
  }

  getDebugFlags() {
    return this.naukarConfig.eternalVars.debugFlags;
  }
}
