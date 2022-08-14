import React from 'react';

import { ui } from '@bangle.io/api';
import { EXECUTE_SEARCH_OPERATION } from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import type { BangleApplicationStore } from '@bangle.io/shared-types';
import { SearchIcon } from '@bangle.io/ui-components';
import { keyDisplayValue, sleep } from '@bangle.io/utils';

import { SearchNotesSidebar } from './components/SearchNotesSidebar';
import {
  extensionName,
  SEARCH_SIDEBAR_NAME,
  SHOW_SEARCH_SIDEBAR_OPERATION,
} from './constants';
import { searchPlugin } from './editor-plugins';
import {
  externalUpdateInputSearchQuery,
  searchNotesSlice,
} from './search-notes-slice';

const key = 'Mod-F';

const extension = Extension.create({
  name: extensionName,

  application: {
    slices: [searchNotesSlice()],
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
      function showSidebar(bangleStore: BangleApplicationStore) {
        if (
          ui.uiSliceKey.getSliceStateAsserted(bangleStore.state).sidebar ===
          SEARCH_SIDEBAR_NAME
        ) {
          const inputEl = document.querySelector<HTMLInputElement>(
            'input[aria-label="Search"]',
          );
          inputEl?.focus();
          inputEl?.select();
        } else {
          ui.setSidebar(SEARCH_SIDEBAR_NAME)(
            bangleStore.state,
            bangleStore.dispatch,
          );
        }
      }

      return {
        handle(operation, payload, bangleStore) {
          switch (operation.name) {
            case SHOW_SEARCH_SIDEBAR_OPERATION: {
              showSidebar(bangleStore);

              return true;
            }
            case EXECUTE_SEARCH_OPERATION: {
              showSidebar(bangleStore);

              externalUpdateInputSearchQuery(payload)(
                bangleStore.state,
                bangleStore.dispatch,
              );

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
  editor: {
    plugins: [searchPlugin],
  },
});

export default extension;
