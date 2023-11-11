import type { EternalVarsWindow, NaukarRemote } from '@bangle.io/shared-types';

import { setupCommon } from '../common-setup';
import { EternalVarsSetupBase } from '../types';

export interface EternalVarsSetupWindow extends EternalVarsSetupBase {
  naukarRemote: NaukarRemote;
}

export function setupEternalVarsWindow(
  config: EternalVarsSetupWindow,
): EternalVarsWindow {
  return {
    ...setupCommon(config),
    naukar: config.naukarRemote,
  };
}
