import { naukarWorkerProxy } from 'naukar-proxy';
import { useState, useContext, useEffect } from 'react';
import { AppStateContext } from 'app-state-context';

const pendingSymbol = Symbol('pending-tasks');

export function PageLifecycle() {
  const [lifecycle, updateLifecycle] = useState();
  const [blockReload, updateBlockReload] = useState(false);
  const { appStateValue, mutableAppStateValue } = useContext(AppStateContext);
  const [{ pageStateCurrent, pageStatePrevious }, updatePageState] = useState({
    pageStateCurrent: undefined,
    pageStatePrevious: undefined,
  });

  useEffect(() => {
    import('page-lifecycle').then(({ default: lifecycle }) => {
      updateLifecycle(lifecycle);
    });
  });

  useEffect(() => {
    updateBlockReload(appStateValue.hasPendingWrites);
  }, [appStateValue.hasPendingWrites]);

  useEffect(() => {
    if (!lifecycle) {
      return;
    }
    if (blockReload) {
      lifecycle.addUnsavedChanges(pendingSymbol);
    } else {
      lifecycle.removeUnsavedChanges(pendingSymbol);
    }
  }, [lifecycle, blockReload]);

  useEffect(() => {
    const handler = (event) => {
      updatePageState({
        pageStateCurrent: event.newState,
        pageStatePrevious: event.oldState,
      });
      mutableAppStateValue.pageLifecycleState = event.newState;
      mutableAppStateValue.prevPageLifecycleState = event.oldState;
    };

    lifecycle?.addEventListener('statechange', handler);
    return () => {
      lifecycle?.removeEventListener('statechange', handler);
    };
  }, [lifecycle, mutableAppStateValue]);

  useEffect(() => {
    // if there was some previous state (obv not active)
    // and the current become active
    if (pageStateCurrent === 'active' && pageStatePrevious) {
      // TODO move this to only reseting if file modified has changed
      naukarWorkerProxy.resetManager();
    }
    // save things immediately when we lose focus
    else if (pageStateCurrent === 'passive' || pageStateCurrent === 'hidden') {
      naukarWorkerProxy.flushDisk();
    }
  }, [pageStateCurrent, pageStatePrevious]);

  return null;
}
