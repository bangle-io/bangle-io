import { useContext, useEffect } from 'react';
import { AppStateContext } from 'app-state-context/index';
import { extensionName } from './config';
import { saveScrollPos, saveSelection } from './persist-scroll';
import { useEditorViewContext } from '@bangle.dev/react';

const LOG = false;

const log = LOG ? console.log.bind(console, extensionName) : () => {};

export function PreserveScroll({ wsPath, editorId }) {
  const { appState } = useContext(AppStateContext);
  usePreserveScroll(appState, wsPath, editorId);
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
          saveScrollPos(wsPath, editorId);
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
