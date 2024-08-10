export type DebugFlags = {
  testNoOp: boolean;
  testDelayWorkerInitialize: number | false;
  testShowAppRootReactError: boolean;
  testShowAppRootSetupError: boolean;
  testDisableWorker: boolean;
  // effects are run in a setTimeout with 0ms delay
  testZeroTimeoutStoreEffectsScheduler: boolean;
  // defaults to indexeddb
  testAppDatabase: 'memory' | 'indexeddb';
};

export type PartialDebugFlags = Partial<DebugFlags>;
