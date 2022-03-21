import React from 'react';

import { keyDisplayValue } from '@bangle.io/config';
import { EXECUTE_SEARCH_OPERATION } from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { SearchIcon } from '@bangle.io/ui-components';

import { SearchNotesSidebar } from './components/SearchNotesSidebar';
import {
  extensionName,
  SearchNotesExtensionState,
  SHOW_SEARCH_SIDEBAR_OPERATION,
  SIDEBAR_NAME,
} from './constants';
import { searchPlugin } from './editor-plugins';
import { SearchNotesOperationHandler } from './SearchNotesOperationHandler';

const key = 'Mod-F';

const extension = Extension.create<SearchNotesExtensionState>({
  name: extensionName,
  initialState: { searchQuery: '', pendingSearch: false, searchResults: null },
  application: {
    ReactComponent: SearchNotesOperationHandler,
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
    sidebars: [
      {
        name: SIDEBAR_NAME,
        title: '🔍 Search notes',
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
