import { useCallback, useContext, useEffect } from 'react';
import { AppStateContext } from 'app-state-context/index';
import { extensionName } from './config';
import { saveScrollPos } from './persist-scroll';

const LOG = true;

const log = LOG ? console.log.bind(console, extensionName) : () => {};

export function PreserveScroll({ wsPath, editorId }) {
  const { appState } = useContext(AppStateContext);
  usePreserveScroll(appState, wsPath, editorId);
  return null;
}

function usePreserveScroll(appState, wsPath, editorId) {
  // watch page lifecycle
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
          saveScrollPos(wsPath, editorId);
        }
      }
    };

    appState.registerListener(listener);

    return () => {
      appState.deregisterListener(listener);
    };
  }, [appState, wsPath, editorId]);
}
