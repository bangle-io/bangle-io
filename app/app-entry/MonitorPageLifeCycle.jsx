import { useEffect } from 'react';
import { appState } from './app-state';

const pendingSymbol = Symbol('pending-tasks');

export function MonitorPageLifeCycle() {
  useEffect(() => {
    let dealWithPendingWrites;
    // dynamic import since it has something which uses document
    // and fucks with worker.
    import('page-lifecycle').then(({ default: lifecycle }) => {
      let blockingReload = false;
      dealWithPendingWrites = function dealWithPendingWrites({
        hasPendingWrites,
      }) {
        console.log({ hasPendingWrites });
        if (hasPendingWrites && !blockingReload) {
          blockingReload = true;
          // TODO show a notification saying saving changes
          lifecycle.addUnsavedChanges(pendingSymbol);
        }
        if (!hasPendingWrites && blockingReload) {
          blockingReload = false;
          lifecycle.removeUnsavedChanges(pendingSymbol);
        }
      };
      appState.register(dealWithPendingWrites);
    });

    return () => {
      dealWithPendingWrites && appState.deregister(dealWithPendingWrites);
    };
  }, []);

  return null;
}
