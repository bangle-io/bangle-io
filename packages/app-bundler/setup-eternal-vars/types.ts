import type { BaseAppDatabase, DebugFlags } from '@bangle.io/shared-types';

export interface EternalVarsSetupBase {
  debugFlags: DebugFlags;
  baseDatabase: BaseAppDatabase;
}
