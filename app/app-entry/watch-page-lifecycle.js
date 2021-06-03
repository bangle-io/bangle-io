import lifecycle from 'page-lifecycle';
import { appState } from './app-state';
lifecycle.addEventListener('statechange', function ({ oldState, newState }) {
  console.log(oldState);
  // naukarWorkerProxy.updatePageState({ newState, oldState });
});

const pendingSymbol = Symbol('pending-tasks');
let blockingReload = false;

function dealWithPendingWrites(hasPendingWrites) {
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
}

appState.register((obj) => {
  dealWithPendingWrites(obj.hasPendingWrites);
});
