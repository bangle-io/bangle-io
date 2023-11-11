import { DebugFlags } from '@bangle.io/shared-types';

export type NaukarInitializeConfig = {
  url: string;
  debugFlags: DebugFlags;
};

export interface NaukarInitialize {
  initialize: (config: NaukarInitializeConfig) => Promise<void>;
  isReady: () => Promise<boolean>;
}
