import { useEffect } from 'react';

import { RegisterSerialOperationHandlerType } from '@bangle.io/extension-registry';
import { useUIManagerContext } from '@bangle.io/ui-context';

import {
  EXECUTE_SEARCH_OPERATION,
  SHOW_SEARCH_SIDEBAR_OPERATION,
  SIDEBAR_NAME,
} from './constants';
import { useSearchNotes, useSearchNotesState } from './hooks';

export function SearchNotesOperationHandler({
  registerSerialOperationHandler,
}: {
  registerSerialOperationHandler: RegisterSerialOperationHandlerType;
}) {
  const { sidebar, dispatch } = useUIManagerContext();
  const [, updateState] = useSearchNotesState();

  useSearchNotes();

  useEffect(() => {
    const deregister = registerSerialOperationHandler((operation) => {
      switch (operation.name) {
        case SHOW_SEARCH_SIDEBAR_OPERATION: {
          showSidebar(sidebar, dispatch);
          return true;
        }
        case EXECUTE_SEARCH_OPERATION: {
          showSidebar(sidebar, dispatch);
          updateState((state) => ({
            ...state,
            searchQuery: operation.value,
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
  }, [dispatch, sidebar, updateState, registerSerialOperationHandler]);
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
    name: 'action::@bangle.io/ui-context:CHANGE_SIDEBAR',
    value: {
      type: SIDEBAR_NAME,
    },
  });
}
