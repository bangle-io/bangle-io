import type { EternalVarsWindow, NaukarRemote } from '@bangle.io/shared-types';

import { EternalVarsSetupBase } from '../types';

export interface EternalVarsSetupWindow extends EternalVarsSetupBase {
  naukarRemote: NaukarRemote;
}

export function setupEternalVarsWindow(
  config: EternalVarsSetupWindow,
): EternalVarsWindow {
  // TODO proxify naukar on naukar is ready access this
  return {
    naukar: config.naukarRemote,
    foo: 'bar',
  };
}
