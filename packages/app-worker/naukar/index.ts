import type { EternalVarsWorker, NaukarBare } from '@bangle.io/shared-types';

interface NaukarConfig {
  eternalVars: EternalVarsWorker;
}

export class Naukar implements NaukarBare {
  constructor(private config: NaukarConfig) {
    //
  }

  async isReady() {
    return true;
  }
}
