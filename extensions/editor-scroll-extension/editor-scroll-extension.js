import {
  useContext,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from 'react';
import { AppStateContext } from 'app-state-context';
import { extensionName } from './config';
import { saveScrollPos, saveSelection } from './persist-scroll';
import { useEditorViewContext } from '@bangle.dev/react';
import { getScrollParentElement, rIdleDebounce } from 'utils';

const LOG = false;

const log = LOG ? console.log.bind(console, extensionName) : () => {};

export function PreserveScroll({ wsPath, editorId }) {
  const { appState } = useContext(AppStateContext);
  usePreserveScroll(appState, wsPath, editorId);
  useMonitorScrollEnd(wsPath, editorId);
  return null;
}

function usePreserveScroll(appState, wsPath, editorId) {
  const view = useEditorViewContext();

  // watch page lifecycle
  useEffect(() => {
    return () => {
      const { selection } = view.state;
      saveSelection(wsPath, editorId, selection);
    };
  }, [view, wsPath, editorId]);

  useEffect(() => {
    const listener = ({ appStateValue }) => {
      if (
        appStateValue.prevPageLifecycleState !==
        appStateValue.pageLifecycleState
      ) {
        if (
          ['active', 'passive', 'terminated', 'hidden'].includes(
            appStateValue.pageLifecycleState,
          )
        ) {
          // immediately as the user might be closing the tab
          saveScrollPos(
            wsPath,
            editorId,
            getScrollParentElement(editorId)?.scrollTop,
          );
          saveSelection(wsPath, editorId, view.state.selection);
        }
      }
    };

    appState.registerListener(listener);

    return () => {
      appState.deregisterListener(listener);
    };
  }, [appState, wsPath, editorId, view]);
}

function useMonitorScrollEnd(wsPath, editorId) {
  const ref = useRef(undefined);

  const queryPos = useCallback(
    (e) => {
      console.count('oye');
      // save the scroll pos on every invocation
      // be
      const scrollParent = getScrollParentElement(editorId);
      ref.current = scrollParent.scrollTop;
    },
    [editorId],
  );

  useLayoutEffect(() => {
    const deb = rIdleDebounce(queryPos);
    window.addEventListener('scroll', deb, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener('scroll', deb, {
        capture: true,
        passive: true,
      });
    };
  }, [queryPos]);

  useEffect(() => {
    return () => {
      if (ref.current !== null) {
        saveScrollPos(wsPath, editorId, ref.current);
      }
    };
  }, [ref, editorId, wsPath]);
}
