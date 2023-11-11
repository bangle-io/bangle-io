import { AppDatabase } from '@bangle.io/app-database';
import type { EternalVarsBase } from '@bangle.io/shared-types';

import type { EternalVarsSetupBase } from './types';

export function setupCommon(config: EternalVarsSetupBase): EternalVarsBase {
  console.debug('debugFlags', config.debugFlags);

  const appDatabase = new AppDatabase({
    database: config.baseDatabase,
  });

  return {
    debugFlags: config.debugFlags,
    appDatabase,
  };
}
