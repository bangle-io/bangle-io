import { useState, useContext, useEffect } from 'react';
import { AppStateContext } from './AppStateContext';

const pendingSymbol = Symbol('pending-tasks');

export function MonitorPageLifeCycle() {
  const [lifecycle, updateLifecycle] = useState();
  const [blockReload, updateBlockReload] = useState(false);
  const { appStateValue } = useContext(AppStateContext);

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

  return null;
}
