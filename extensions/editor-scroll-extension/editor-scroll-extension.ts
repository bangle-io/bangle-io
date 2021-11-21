import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

import { useEditorViewContext } from '@bangle.dev/react';

import { AppStateContext } from '@bangle.io/app-state-context';
import {
  getScrollParentElement,
  rIdleDebounce,
  useEditorPluginMetadata,
} from '@bangle.io/utils';

import { extensionName } from './config';
import { saveScrollPos, saveSelection } from './persist-scroll';

const LOG = false;

const log = LOG ? console.log.bind(console, extensionName) : () => {};

export function PreserveScroll() {
  const { appState } = useContext(AppStateContext);
  const { wsPath, editorId } = useEditorPluginMetadata();
  usePreserveScroll(appState, wsPath, editorId);
  useMonitorScrollEnd(wsPath, editorId);
  return null;
}

function usePreserveScroll(appState, wsPath: string, editorId?: number) {
  const view = useEditorViewContext();

  // watch page lifecycle
  useEffect(() => {
    return () => {
      const { selection } = view.state;
      if (typeof editorId === 'number') {
        saveSelection(wsPath, editorId, selection);
      }
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
          if (typeof editorId === 'number') {
            // immediately as the user might be closing the tab
            saveScrollPos(
              wsPath,
              editorId,
              getScrollParentElement(editorId)?.scrollTop,
            );
            saveSelection(wsPath, editorId, view.state.selection);
          }
        }
      }
    };

    appState.registerListener(listener);

    return () => {
      appState.deregisterListener(listener);
    };
  }, [appState, wsPath, editorId, view]);
}

function useMonitorScrollEnd(wsPath: string, editorId?: number) {
  const ref = useRef<number | null>(null);

  const queryPos = useCallback(
    (e) => {
      if (typeof editorId === 'number') {
        // save the scroll pos on every invocation
        const scrollParent = getScrollParentElement(editorId);
        ref.current = scrollParent?.scrollTop || null;
      }
    },
    [editorId],
  );

  useLayoutEffect(() => {
    const deb = rIdleDebounce(queryPos);
    const opts = {
      capture: true,
      passive: true,
    };
    window.addEventListener('scroll', deb, opts);
    return () => {
      window.removeEventListener('scroll', deb, opts);
    };
  }, [queryPos]);

  useEffect(() => {
    return () => {
      if (ref.current !== null && typeof editorId === 'number') {
        saveScrollPos(wsPath, editorId, ref.current);
      }
    };
  }, [ref, editorId, wsPath]);
}
