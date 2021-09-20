import { keyDisplayValue } from 'config';
import { Extension } from 'extension-registry';
import React from 'react';
import { SearchIcon } from 'ui-components';
import { searchPlugin } from './editor-plugins';
import { SearchNotesActionHandler } from './action-handler';
import { SearchNotesSidebar } from './components/SearchNotesSidebar';
import {
  EXECUTE_SEARCH_ACTION,
  extensionName,
  SearchNotesExtensionState,
  SHOW_SEARCH_SIDEBAR_ACTION,
  SIDEBAR_NAME,
} from './constants';
const key = 'Mod-F';

const extension = Extension.create<SearchNotesExtensionState>({
  name: extensionName,
  initialState: { searchQuery: '', pendingSearch: false, searchResults: null },
  application: {
    ReactComponent: SearchNotesActionHandler,
    actions: [
      {
        name: SHOW_SEARCH_SIDEBAR_ACTION,
        title: 'Open search sidebar',
        keybinding: key,
      },
      {
        name: EXECUTE_SEARCH_ACTION,
        title: 'Execute search',
        hidden: true,
      },
    ],
    sidebars: [
      {
        name: SIDEBAR_NAME,
        hint: `Search notes\n` + keyDisplayValue(key),
        icon: React.createElement(SearchIcon, {}),
        ReactComponent: SearchNotesSidebar,
      },
    ],
  },
  editor: {
    plugins: [searchPlugin],
  },
});

export default extension;
