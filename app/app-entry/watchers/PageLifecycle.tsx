import { useEffect } from 'react';

import { useSliceState } from '@bangle.io/app-state-context';
import { pageSliceKey } from '@bangle.io/constants';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import { trimEndWhiteSpaceBeforeCursor } from '@bangle.io/utils';

export function PageLifecycle() {
  const { forEachEditor } = useEditorManagerContext();
  const { sliceState: pageState } = useSliceState(pageSliceKey);

  const lifeCycleState = pageState?.lifeCycleState;

  useEffect(() => {
    let hookChanged = false;
    if (lifeCycleState) {
      const { previous: pageStatePrevious, current: pageStateCurrent } =
        lifeCycleState;
      // if there was some previous state (obv not active)
      // and the current become active
      if (pageStateCurrent === 'active' && pageStatePrevious) {
        naukarWorkerProxy.flushDisk().then(() => {
          if (!hookChanged) {
            naukarWorkerProxy.resetManager();
          }
        });
      }
      // save things immediately when we lose focus
      else if (
        pageStateCurrent === 'passive' ||
        pageStateCurrent === 'hidden'
      ) {
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
    }
    return () => {
      hookChanged = true;
    };
  }, [lifeCycleState, forEachEditor]);

  return null;
}
