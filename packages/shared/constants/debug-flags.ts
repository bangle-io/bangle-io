import { DebugFlags } from '@bangle.io/shared-types';

// WARNING: keep them static hardcoded -- do not calculate them!
// we want to have same values across all environments
export const DEFAULT_DEBUG_FLAGS: DebugFlags = {
  testNoOp: false,
  testDelayWorkerInitialize: false,
  testShowAppRootReactError: false,
  testShowAppRootSetupError: false,
  testDisableWorker: false,
  testAppDatabase: 'indexeddb',
};
