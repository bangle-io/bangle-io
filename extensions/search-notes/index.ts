import React from 'react';
import { Extension } from 'extension-registry';
import { SearchNotesSidebar } from './SearchNotesSidebar';
import { SearchIcon } from 'ui-components';
import { SearchNotesActionHandler } from './SearchNotesActionHandler';
import { keyDisplayValue } from 'config';
import { searchPlugin } from './search-plugin';
import { SHOW_SEARCH_SIDEBAR_ACTION, SIDEBAR_NAME } from './types';
const extensionName = 'search-notes';
const key = 'Mod-F';

const extension = Extension.create({
  name: extensionName,
  application: {
    ReactComponent: SearchNotesActionHandler,
    actions: [
      {
        name: SHOW_SEARCH_SIDEBAR_ACTION,
        title: 'Open search sidebar',
        keybinding: key,
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
