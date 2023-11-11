import type { BaseAppDatabase } from '@bangle.io/app-database';
import type { DebugFlags } from '@bangle.io/shared-types';

export interface EternalVarsSetupBase {
  debugFlags: DebugFlags;
  baseDatabase: BaseAppDatabase;
}
