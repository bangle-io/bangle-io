import type { Store } from '@nalanda/core';

import type { FinalConfig } from '@bangle.io/config-template';
import { NaukarRemote } from '@bangle.io/shared-types';
// this is used by e2e testing suite
export interface E2eTypes {
  config: FinalConfig;
  naukar: NaukarRemote;
}

// this is used by e2e testing suite
export interface WorkerE2eTypes {
  store: Store;
}
