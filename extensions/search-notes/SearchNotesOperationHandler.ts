import { useSerialOperationHandler } from '@bangle.io/serial-operation-context';
import { changeSidebar, useUIManagerContext } from '@bangle.io/slice-ui';

import {
  EXECUTE_SEARCH_OPERATION,
  SHOW_SEARCH_SIDEBAR_OPERATION,
  SIDEBAR_NAME,
} from './constants';
import { useSearchNotes, useSearchNotesState } from './hooks';

export function SearchNotesOperationHandler() {
  const { sidebar, bangleStore } = useUIManagerContext();
  const [, updateState] = useSearchNotesState();

  useSearchNotes();

  useSerialOperationHandler(
    (operation) => {
      switch (operation.name) {
        case SHOW_SEARCH_SIDEBAR_OPERATION: {
          showSidebar(sidebar, bangleStore);
          return true;
        }
        case EXECUTE_SEARCH_OPERATION: {
          showSidebar(sidebar, bangleStore);
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
    },
    [bangleStore, sidebar, updateState],
  );

  return null;
}

function showSidebar(
  sidebar,
  bangleStore: ReturnType<typeof useUIManagerContext>['bangleStore'],
) {
  if (sidebar === SIDEBAR_NAME) {
    const inputEl = document.querySelector<HTMLInputElement>(
      'input[aria-label="Search"]',
    );
    inputEl?.focus();
    inputEl?.select();
  }

  changeSidebar(SIDEBAR_NAME)(bangleStore.state, bangleStore.dispatch);
}
