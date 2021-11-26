import { useContext, useEffect, useState } from 'react';

import { AppStateContext } from '@bangle.io/app-state-context';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import { trimEndWhiteSpaceBeforeCursor } from '@bangle.io/utils';

const pendingSymbol = Symbol('pending-tasks');

export function PageLifecycle() {
  const [lifecycle, updateLifecycle] = useState<
    | undefined
    | {
        addEventListener: (name: string, cb: any) => {};
        removeEventListener: (name: string, cb: any) => {};
        addUnsavedChanges: (s: Symbol) => void;
        removeUnsavedChanges: (s: Symbol) => void;
      }
  >();
  const [blockReload, updateBlockReload] = useState(false);
  const { appStateValue, mutableAppStateValue } = useContext(AppStateContext);
  const [{ pageStateCurrent, pageStatePrevious }, updatePageState] = useState({
    pageStateCurrent: undefined,
    pageStatePrevious: undefined,
  });

  const { forEachEditor } = useEditorManagerContext();

  useEffect(() => {
    import('page-lifecycle').then(({ default: lifecycle }) => {
      updateLifecycle(lifecycle);
    });
  });

  useEffect(() => {
    updateBlockReload(Boolean(appStateValue?.hasPendingWrites));
  }, [appStateValue, appStateValue?.hasPendingWrites]);

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
      if (mutableAppStateValue) {
        updatePageState({
          pageStateCurrent: event.newState,
          pageStatePrevious: event.oldState,
        });

        mutableAppStateValue.pageLifecycleState = event.newState;
        mutableAppStateValue.prevPageLifecycleState = event.oldState;
      }
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
      forEachEditor((editor, i) => {
        if (editor.view.hasFocus()) {
          // To avoid cursor jumping across due markdown whitespace elimination
          // this removes the white space to prevent cursor jumping.
          // Not ideal though
          trimEndWhiteSpaceBeforeCursor()(
            editor.view.state,
            editor.view.dispatch,
          );
        }
      });
      naukarWorkerProxy.flushDisk();
    }
  }, [pageStateCurrent, pageStatePrevious, forEachEditor]);

  return null;
}
