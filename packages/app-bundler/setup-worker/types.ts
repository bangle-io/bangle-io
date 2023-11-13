import { DebugFlags, EternalVarsParentInfo } from '@bangle.io/shared-types';

export type NaukarInitializeConfig = {
  url: string;
  debugFlags: DebugFlags;
  parentInfo: EternalVarsParentInfo;
};

export interface NaukarInitialize {
  initialize: (config: NaukarInitializeConfig) => Promise<void>;
  isReady: () => Promise<boolean>;
}
