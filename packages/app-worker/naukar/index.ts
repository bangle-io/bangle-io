import { config } from '@bangle.io/config';
import type { EternalVarsWorker, NaukarBare } from '@bangle.io/shared-types';

interface NaukarConfig {
  eternalVars: EternalVarsWorker;
}

export class Naukar implements NaukarBare {
  constructor(private naukarConfig: NaukarConfig) {
    //
  }

  ok() {
    return true;
  }

  getDebugFlags() {
    return this.naukarConfig.eternalVars.debugFlags;
  }
}
