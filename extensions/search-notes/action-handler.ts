import { RegisterActionHandlerType } from 'extension-registry';
import { useEffect } from 'react';
import { useUIManagerContext } from 'ui-context';

import {
  EXECUTE_SEARCH_ACTION,
  SHOW_SEARCH_SIDEBAR_ACTION,
  SIDEBAR_NAME,
} from './constants';
import { useSearchNotes, useSearchNotesState } from './hooks';

export function SearchNotesActionHandler({
  registerActionHandler,
}: {
  registerActionHandler: RegisterActionHandlerType;
}) {
  const { sidebar, dispatch } = useUIManagerContext();
  const [, updateState] = useSearchNotesState();

  useSearchNotes();

  useEffect(() => {
    const deregister = registerActionHandler((actionObject) => {
      switch (actionObject.name) {
        case SHOW_SEARCH_SIDEBAR_ACTION: {
          showSidebar(sidebar, dispatch);
          return true;
        }
        case EXECUTE_SEARCH_ACTION: {
          showSidebar(sidebar, dispatch);
          updateState((state) => ({
            ...state,
            searchQuery: actionObject.value,
          }));
          return true;
        }
        default: {
          return false;
        }
      }
    });
    return () => {
      deregister();
    };
  }, [dispatch, sidebar, updateState, registerActionHandler]);
  return null;
}

function showSidebar(sidebar, dispatch) {
  if (sidebar === SIDEBAR_NAME) {
    const inputEl = document.querySelector<HTMLInputElement>(
      'input[aria-label="Search"]',
    );
    inputEl?.focus();
    inputEl?.select();
  }
  dispatch({
    type: 'UI/CHANGE_SIDEBAR',
    value: {
      type: SIDEBAR_NAME,
    },
  });
}
