import { AppDatabase } from '@bangle.io/app-database';

import { DebugFlags } from './debug-flags';

export interface EternalVarsBase {
  debugFlags: DebugFlags;
  appDatabase: AppDatabase;
}
