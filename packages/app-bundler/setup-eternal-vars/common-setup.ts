import type { EternalVarsBase } from '@bangle.io/shared-types';

import type { EternalVarsSetupBase } from './types';

export function setupCommon(config: EternalVarsSetupBase): EternalVarsBase {
  console.debug('debugFlags', config.debugFlags);

  return {
    debugFlags: config.debugFlags,
  };
}
