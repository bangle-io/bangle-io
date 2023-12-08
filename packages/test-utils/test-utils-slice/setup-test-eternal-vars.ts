import { AppDatabaseInMemory } from '@bangle.io/app-database-in-memory';
import { AppDatabaseIndexedDB } from '@bangle.io/app-database-indexeddb';
import { DEFAULT_DEBUG_FLAGS } from '@bangle.io/constants';
import { setupEternalVarsWindow } from '@bangle.io/setup-eternal-vars/window';
import { setupWorker } from '@bangle.io/setup-worker';
import { DebugFlags } from '@bangle.io/shared-types';

export function setupTestEternalVars({
  debugFlags,
  abortSignal,
}: {
  abortSignal: AbortSignal;
  debugFlags?: Partial<DebugFlags>;
}) {
  const finalDebugFlags: DebugFlags = {
    ...DEFAULT_DEBUG_FLAGS,
    testAppDatabase: 'memory',
    testDisableWorker: true,
    testZeroTimeoutStoreEffectsScheduler: true,
    ...debugFlags,
  };

  const database =
    finalDebugFlags.testAppDatabase === 'memory'
      ? new AppDatabaseInMemory()
      : new AppDatabaseIndexedDB();

  const { naukarRemote, naukarTerminate } = setupWorker({
    debugFlags: finalDebugFlags,
  });

  const eternalVars = setupEternalVarsWindow({
    naukarRemote,
    debugFlags: finalDebugFlags,
    baseDatabase: database,
    abortSignal,
  });

  abortSignal.addEventListener(
    'abort',
    () => {
      void naukarTerminate();
    },
    { once: true },
  );

  return eternalVars;
}
