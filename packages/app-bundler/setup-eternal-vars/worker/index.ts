import type {
  EternalVarsParentInfo,
  EternalVarsWorker,
} from '@bangle.io/shared-types';

import { setupCommon } from '../common-setup';
import { EternalVarsSetupBase } from '../types';

export interface EternalVarsSetupWorker extends EternalVarsSetupBase {
  type: 'worker';
  parentInfo: EternalVarsParentInfo;
}

export function setupEternalVarsWorker(
  config: EternalVarsSetupWorker,
): EternalVarsWorker {
  return {
    parentInfo: config.parentInfo,
    ...setupCommon(config),
  };
}
