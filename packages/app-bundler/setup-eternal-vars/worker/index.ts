import type { EternalVarsWorker } from '@bangle.io/shared-types';

import { setupCommon } from '../common-setup';
import { EternalVarsSetupBase } from '../types';

export interface EternalVarsSetupWorker extends EternalVarsSetupBase {
  type: 'worker';
}

export function setupEternalVarsWorker(
  config: EternalVarsSetupWorker,
): EternalVarsWorker {
  return {
    ...setupCommon(config),
  };
}
