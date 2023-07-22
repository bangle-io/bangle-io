import React from 'react';

import { Extension, getExtensionStore, nsmApi2 } from '@bangle.io/api';
import { EXECUTE_SEARCH_OPERATION } from '@bangle.io/constants';
import { SearchIcon } from '@bangle.io/ui-components';
import { keyDisplayValue } from '@bangle.io/utils';

import { SearchNotesSidebar } from './components/SearchNotesSidebar';
import {
  extensionName,
  SEARCH_SIDEBAR_NAME,
  SHOW_SEARCH_SIDEBAR_OPERATION,
} from './constants';
import {
  searchEffects,
  searchSlice,
  updateExternalSearchQuery,
} from './search-notes-slice';

const key = 'Mod-F';

const extension = Extension.create({
  name: extensionName,

  application: {
    nsmSlices: [searchSlice],
    nsmEffects: searchEffects,
    operations: [
      {
        name: SHOW_SEARCH_SIDEBAR_OPERATION,
        title: 'Open search sidebar',
        keybinding: key,
      },
      {
        name: EXECUTE_SEARCH_OPERATION,
        title: 'Execute search',
        hidden: true,
      },
    ],
    operationHandler() {
      function showSidebar() {
        const sidebar = nsmApi2.ui.uiState().sidebar;

        if (sidebar === SEARCH_SIDEBAR_NAME) {
          const inputEl = document.querySelector<HTMLInputElement>(
            'input[aria-label="Search"]',
          );
          inputEl?.focus();
          inputEl?.select();
        } else {
          nsmApi2.ui.changeSidebar(SEARCH_SIDEBAR_NAME);
        }
      }

      return {
        handle(operation, payload) {
          const nsmStore = getExtensionStore(searchSlice);

          switch (operation.name) {
            case SHOW_SEARCH_SIDEBAR_OPERATION: {
              showSidebar();

              return true;
            }
            case EXECUTE_SEARCH_OPERATION: {
              showSidebar();

              if (typeof payload !== 'string') {
                throw new Error(
                  `Invalid payload for ${EXECUTE_SEARCH_OPERATION} operation`,
                );
              }

              nsmStore.dispatch(updateExternalSearchQuery(payload));

              return true;
            }
            default: {
              return false;
            }
          }
        },
      };
    },
    sidebars: [
      {
        name: SEARCH_SIDEBAR_NAME,
        title: 'Search notes',
        hint: `Search notes\n` + keyDisplayValue(key),
        activitybarIcon: React.createElement(SearchIcon, {}),
        ReactComponent: SearchNotesSidebar,
      },
    ],
  },
  editor: {},
});

export default extension;
