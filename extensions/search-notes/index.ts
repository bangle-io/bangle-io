import React from 'react';
import { Extension } from 'extension-registry/index';
import { SearchNotesSidebar } from './SearchNotesSidebar';
import { SearchIcon } from 'ui-components/index';
import { SearchNotesActionHandler } from './SearchNotesActionHandler';
import { keyDisplayValue } from 'config';
const extensionName = 'search-notes';
const key = 'Mod-F';
const extension = Extension.create({
  name: extensionName,
  application: {
    actions: [
      {
        name: '@action/search-notes/show-search-sidebar',
        title: 'Search notes',
        keybinding: key,
      },
    ],
    sidebars: [
      {
        name: '@sidebar/search-notes/search-notes',
        hint: `Search notes\n` + keyDisplayValue(key),
        icon: React.createElement(SearchIcon, {}),
        ReactComponent: SearchNotesSidebar,
      },
    ],
    ReactComponent: SearchNotesActionHandler,
  },
});

export default extension;
