export type DebugFlags = {
  testNoOp: boolean;
  testDelayWorkerInitialize: number | false;
  testShowAppRootReactError: boolean;
  testShowAppRootSetupError: boolean;
  testDisableWorker: boolean;

  // defaults to indexeddb
  testAppDatabase: 'memory' | 'indexeddb';
};

export type PartialDebugFlags = Partial<DebugFlags>;
